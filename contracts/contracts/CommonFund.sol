// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CommonFund — arkadaş grupları için ortak kasa ve kura
/// @notice Her ay herkes eşit taksit yatırır, kurayla biri havuzu alır.
///         Para bu sözleşmede durur; Muhtar ve Bekçi'nin yetkileri aşağıda sınırlanmıştır.
contract CommonFund {
    // ---------------------------------------------------------------------
    // Tipler
    // ---------------------------------------------------------------------

    enum Status {
        Forming, // üyeler katılıyor
        Active, // turlar dönüyor
        Completed // herkes havuzu aldı
    }

    /// Etkinlik türleri (arayüzdeki işlem geçmişi ve "ne yaptım" kartları bunlardan üretilir)
    enum Kind {
        Created, // 0  Kâtip yardımıyla grup kuruldu
        Joined, // 1  üye teminatını yatırıp katıldı
        Started, // 2  grup doldu, 1. tur başladı
        Paid, // 3  taksit ödendi
        Excuse, // 4  üye mazeret yazdı
        Flagged, // 5  Bekçi gecikmeyi işaretledi
        Extension, // 6  Muhtar süre verdi
        Slashed, // 7  Muhtar teminattan kesti
        AutoSlashed, // 8  süre doldu, kural gereği teminattan kesildi
        Draw, // 9  kura çekildi, havuz kazanana gönderildi
        TopUp, // 10 teminat tamamlandı
        Withdraw // 11 teminat iade edildi
    }

    struct Group {
        string name;
        address creator;
        uint8 size;
        uint256 installment;
        uint256 collateral;
        uint64 payWindow; // tur başından itibaren son ödeme süresi (sn)
        uint64 period; // turlar arası süre (sn)
        uint64 maxExtension; // Muhtar'ın verebileceği en uzun ek süre (sn)
        Status status;
        uint8 round; // 1'den başlar
        uint64 roundStart;
        uint256 pot; // bu turun havuzu
        address[] members;
    }

    struct Member {
        bool joined;
        bool received;
        uint8 receivedRound;
        uint8 lateCount;
        bool withdrawn;
        uint256 collateralLeft;
        string nickname;
    }

    struct RoundState {
        bool paid; // taksit ödendi ya da teminattan karşılandı
        bool covered; // teminattan karşılandı
        bool excuse; // mazeret yazıldı
        bool decided; // Muhtar karar verdi
        bool flagged; // Bekçi işaretledi
        bool lateCounted;
        uint64 extendedUntil; // 0 ise süre verilmedi
    }

    struct Activity {
        Kind kind;
        address actor;
        address subject;
        uint256 amount;
        uint64 time;
        uint64 blockNumber;
        string text;
    }

    struct GroupView {
        uint256 id;
        string name;
        address creator;
        uint8 size;
        uint256 installment;
        uint256 collateral;
        uint64 payWindow;
        uint64 period;
        uint64 maxExtension;
        Status status;
        uint8 round;
        uint64 roundStart;
        uint64 deadline;
        uint256 pot;
        uint256 paidCount;
        address[] members;
    }

    struct MemberView {
        address account;
        string nickname;
        bool received;
        uint8 receivedRound;
        uint8 lateCount;
        bool withdrawn;
        uint256 collateralLeft;
        bool paid;
        bool covered;
        bool excuse;
        bool decided;
        bool flagged;
        uint64 extendedUntil;
    }

    // ---------------------------------------------------------------------
    // Durum
    // ---------------------------------------------------------------------

    address public immutable muhtar;
    address public immutable bekci;

    uint256 public groupCount;
    mapping(uint256 => Group) internal groups;
    mapping(uint256 => mapping(address => Member)) public memberInfo;
    mapping(uint256 => mapping(uint8 => mapping(address => RoundState))) public roundState;
    mapping(uint256 => mapping(uint8 => uint256)) public roundPaidCount;
    mapping(uint256 => mapping(uint8 => address)) public roundWinner;
    mapping(uint256 => Activity[]) internal activities;
    mapping(address => uint256[]) internal userGroups;

    uint256 private locked = 1;

    event ActivityLogged(
        uint256 indexed groupId,
        uint256 indexed index,
        Kind kind,
        address actor,
        address subject,
        uint256 amount,
        string text
    );

    // ---------------------------------------------------------------------
    // Hatalar
    // ---------------------------------------------------------------------

    error NotMuhtar();
    error NotBekci();
    error BadParams();
    error WrongAmount();
    error WrongStatus();
    error NotMember();
    error AlreadyMember();
    error GroupFull();
    error AlreadyPaid();
    error NotLateYet();
    error NoExcuse();
    error AlreadyDecided();
    error AlreadyDone();
    error NotEveryonePaid();
    error TransferFailed();
    error Reentrancy();

    modifier onlyMuhtar() {
        if (msg.sender != muhtar) revert NotMuhtar();
        _;
    }

    modifier onlyBekci() {
        if (msg.sender != bekci) revert NotBekci();
        _;
    }

    modifier nonReentrant() {
        if (locked != 1) revert Reentrancy();
        locked = 2;
        _;
        locked = 1;
    }

    constructor(address _muhtar, address _bekci) {
        if (_muhtar == address(0) || _bekci == address(0)) revert BadParams();
        muhtar = _muhtar;
        bekci = _bekci;
    }

    // ---------------------------------------------------------------------
    // Grup kurma ve katılma
    // ---------------------------------------------------------------------

    /// @notice Grubu kurar; kuran kişi teminatını yatırarak ilk üye olur.
    function createGroup(
        string calldata name,
        uint8 size,
        uint256 installment,
        uint256 collateral,
        uint64 payWindow,
        uint64 period,
        uint64 maxExtension,
        string calldata nickname
    ) external payable returns (uint256 id) {
        if (
            size < 2 || size > 20 || installment == 0 || payWindow == 0 || period < payWindow || maxExtension == 0
                || bytes(name).length == 0 || bytes(name).length > 64
        ) revert BadParams();
        if (msg.value != collateral) revert WrongAmount();

        id = ++groupCount;
        Group storage g = groups[id];
        g.name = name;
        g.creator = msg.sender;
        g.size = size;
        g.installment = installment;
        g.collateral = collateral;
        g.payWindow = payWindow;
        g.period = period;
        g.maxExtension = maxExtension;
        g.status = Status.Forming;

        _log(id, Kind.Created, msg.sender, msg.sender, 0, name);
        _join(id, msg.sender, nickname);
    }

    /// @notice Davet koduyla (grup numarası) teminatını yatırıp gruba katılır.
    function join(uint256 id, string calldata nickname) external payable {
        Group storage g = groups[id];
        if (g.size == 0 || g.status != Status.Forming) revert WrongStatus();
        if (memberInfo[id][msg.sender].joined) revert AlreadyMember();
        if (g.members.length >= g.size) revert GroupFull();
        if (msg.value != g.collateral) revert WrongAmount();
        _join(id, msg.sender, nickname);
    }

    function _join(uint256 id, address who, string calldata nickname) internal {
        if (bytes(nickname).length == 0 || bytes(nickname).length > 24) revert BadParams();
        Group storage g = groups[id];
        g.members.push(who);
        memberInfo[id][who] = Member({
            joined: true,
            received: false,
            receivedRound: 0,
            lateCount: 0,
            withdrawn: false,
            collateralLeft: g.collateral,
            nickname: nickname
        });
        userGroups[who].push(id);
        _log(id, Kind.Joined, who, who, g.collateral, nickname);

        if (g.members.length == g.size) {
            g.status = Status.Active;
            g.round = 1;
            g.roundStart = uint64(block.timestamp);
            _log(id, Kind.Started, who, address(0), 0, "");
        }
    }

    // ---------------------------------------------------------------------
    // Taksit ve mazeret
    // ---------------------------------------------------------------------

    function payInstallment(uint256 id) external payable {
        Group storage g = groups[id];
        if (g.status != Status.Active) revert WrongStatus();
        if (!memberInfo[id][msg.sender].joined) revert NotMember();
        RoundState storage rs = roundState[id][g.round][msg.sender];
        if (rs.paid) revert AlreadyPaid();
        if (msg.value != g.installment) revert WrongAmount();

        rs.paid = true;
        g.pot += msg.value;
        roundPaidCount[id][g.round] += 1;
        _log(id, Kind.Paid, msg.sender, msg.sender, msg.value, "");
    }

    /// @notice Geciken üye mazeretini yazar; Muhtar bunu okuyup karar verir.
    function submitExcuse(uint256 id, string calldata text) external {
        Group storage g = groups[id];
        if (g.status != Status.Active) revert WrongStatus();
        if (!memberInfo[id][msg.sender].joined) revert NotMember();
        if (bytes(text).length == 0 || bytes(text).length > 500) revert BadParams();
        RoundState storage rs = roundState[id][g.round][msg.sender];
        if (rs.paid) revert AlreadyPaid();
        if (rs.excuse) revert AlreadyDone();
        if (block.timestamp <= deadline(id)) revert NotLateYet();

        rs.excuse = true;
        _countLate(id, g.round, msg.sender);
        _log(id, Kind.Excuse, msg.sender, msg.sender, 0, text);
    }

    // ---------------------------------------------------------------------
    // Bekçi: yalnızca işaretler ve mesaj bırakır, paraya dokunamaz
    // ---------------------------------------------------------------------

    function flagLate(uint256 id, address member, string calldata message) external onlyBekci {
        Group storage g = groups[id];
        if (g.status != Status.Active) revert WrongStatus();
        if (!memberInfo[id][member].joined) revert NotMember();
        RoundState storage rs = roundState[id][g.round][member];
        if (rs.paid) revert AlreadyPaid();
        if (rs.flagged) revert AlreadyDone();
        if (block.timestamp <= deadline(id)) revert NotLateYet();
        if (bytes(message).length > 500) revert BadParams();

        rs.flagged = true;
        _countLate(id, g.round, member);
        _log(id, Kind.Flagged, msg.sender, member, 0, message);
    }

    // ---------------------------------------------------------------------
    // Muhtar: yalnızca mazeret yazmış ve ödememiş üye için karar verebilir
    // ---------------------------------------------------------------------

    /// @notice Süre ver: son ödeme gününe en fazla `maxExtension` ekler.
    function grantExtension(uint256 id, address member, uint64 extraSeconds, string calldata reason)
        external
        onlyMuhtar
    {
        Group storage g = groups[id];
        RoundState storage rs = _decidable(id, member);
        if (extraSeconds == 0 || extraSeconds > g.maxExtension) revert BadParams();

        rs.decided = true;
        rs.extendedUntil = deadline(id) + extraSeconds;
        _log(id, Kind.Extension, msg.sender, member, rs.extendedUntil, reason);
    }

    /// @notice Teminatı kes: en fazla bir taksit tutarını teminattan alıp bu turun havuzuna ekler.
    function slashCollateral(uint256 id, address member, string calldata reason) external onlyMuhtar {
        RoundState storage rs = _decidable(id, member);
        rs.decided = true;
        uint256 amount = _cover(id, member);
        _log(id, Kind.Slashed, msg.sender, member, amount, reason);
    }

    function _decidable(uint256 id, address member) internal view returns (RoundState storage rs) {
        Group storage g = groups[id];
        if (g.status != Status.Active) revert WrongStatus();
        if (!memberInfo[id][member].joined) revert NotMember();
        rs = roundState[id][g.round][member];
        if (rs.paid) revert AlreadyPaid();
        if (!rs.excuse) revert NoExcuse();
        if (rs.decided) revert AlreadyDone();
    }

    /// @notice Kural: süresi dolmuş ve ödememiş üyenin taksiti teminattan karşılanır. Herkes çağırabilir.
    ///         Son günden sonra mazeret ve Muhtar kararı için `maxExtension` kadar beklenir.
    function enforceLate(uint256 id, address member) external {
        Group storage g = groups[id];
        if (g.status != Status.Active) revert WrongStatus();
        if (!memberInfo[id][member].joined) revert NotMember();
        RoundState storage rs = roundState[id][g.round][member];
        if (rs.paid) revert AlreadyPaid();

        // Süre verildiyse o tarih; verilmediyse mazeret yazılabilsin diye son günden sonra `maxExtension` kadar beklenir.
        uint64 due = rs.extendedUntil != 0 ? rs.extendedUntil : deadline(id) + g.maxExtension;
        if (block.timestamp <= due) revert NotLateYet();

        rs.decided = true;
        _countLate(id, g.round, member);
        uint256 amount = _cover(id, member);
        _log(id, Kind.AutoSlashed, msg.sender, member, amount, "");
    }

    function _cover(uint256 id, address member) internal returns (uint256 amount) {
        Group storage g = groups[id];
        Member storage m = memberInfo[id][member];
        RoundState storage rs = roundState[id][g.round][member];
        amount = m.collateralLeft < g.installment ? m.collateralLeft : g.installment;
        m.collateralLeft -= amount;
        g.pot += amount;
        rs.paid = true;
        rs.covered = true;
        roundPaidCount[id][g.round] += 1;
    }

    function _countLate(uint256 id, uint8 round, address member) internal {
        RoundState storage rs = roundState[id][round][member];
        if (!rs.lateCounted) {
            rs.lateCounted = true;
            memberInfo[id][member].lateCount += 1;
        }
    }

    // ---------------------------------------------------------------------
    // Kura
    // ---------------------------------------------------------------------

    /// @notice Herkesin taksiti geldiğinde herkes kura çekebilir.
    ///         Havuz, daha önce almamış üyeler arasından seçilen kişiye gönderilir.
    /// @dev Deneme ağı için block.prevrandao kullanılır; gerçek parayla çalışacak sürümde
    ///      doğrulanabilir rastgelelik (VRF) kullanılmalıdır.
    function draw(uint256 id) external nonReentrant returns (address winner) {
        Group storage g = groups[id];
        if (g.status != Status.Active) revert WrongStatus();
        uint8 round = g.round;
        if (roundPaidCount[id][round] < g.size) revert NotEveryonePaid();

        uint256 eligible = uint256(g.size) - (uint256(round) - 1);
        uint256 pick = uint256(keccak256(abi.encode(block.prevrandao, block.timestamp, id, round, address(this))))
            % eligible;
        for (uint256 i = 0; i < g.members.length; i++) {
            address a = g.members[i];
            if (!memberInfo[id][a].received) {
                if (pick == 0) {
                    winner = a;
                    break;
                }
                pick--;
            }
        }

        uint256 amount = g.pot;
        g.pot = 0;
        memberInfo[id][winner].received = true;
        memberInfo[id][winner].receivedRound = round;
        roundWinner[id][round] = winner;
        _log(id, Kind.Draw, msg.sender, winner, amount, "");

        if (round == g.size) {
            g.status = Status.Completed;
        } else {
            g.round = round + 1;
            uint64 next = g.roundStart + g.period;
            g.roundStart = next > block.timestamp ? next : uint64(block.timestamp);
        }

        (bool ok,) = winner.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ---------------------------------------------------------------------
    // Teminat
    // ---------------------------------------------------------------------

    function topUpCollateral(uint256 id) external payable {
        Group storage g = groups[id];
        Member storage m = memberInfo[id][msg.sender];
        if (!m.joined) revert NotMember();
        if (g.status == Status.Completed) revert WrongStatus();
        if (msg.value == 0 || m.collateralLeft + msg.value > g.collateral) revert WrongAmount();
        m.collateralLeft += msg.value;
        _log(id, Kind.TopUp, msg.sender, msg.sender, msg.value, "");
    }

    /// @notice Grup bitince kalan teminat sahibine geri döner.
    function withdrawCollateral(uint256 id) external nonReentrant {
        Group storage g = groups[id];
        Member storage m = memberInfo[id][msg.sender];
        if (!m.joined) revert NotMember();
        if (g.status != Status.Completed) revert WrongStatus();
        if (m.withdrawn) revert AlreadyDone();
        uint256 amount = m.collateralLeft;
        m.collateralLeft = 0;
        m.withdrawn = true;
        _log(id, Kind.Withdraw, msg.sender, msg.sender, amount, "");
        (bool ok,) = msg.sender.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    // ---------------------------------------------------------------------
    // Okuma
    // ---------------------------------------------------------------------

    function deadline(uint256 id) public view returns (uint64) {
        Group storage g = groups[id];
        return g.roundStart + g.payWindow;
    }

    function getGroup(uint256 id) external view returns (GroupView memory v) {
        Group storage g = groups[id];
        v.id = id;
        v.name = g.name;
        v.creator = g.creator;
        v.size = g.size;
        v.installment = g.installment;
        v.collateral = g.collateral;
        v.payWindow = g.payWindow;
        v.period = g.period;
        v.maxExtension = g.maxExtension;
        v.status = g.status;
        v.round = g.round;
        v.roundStart = g.roundStart;
        v.deadline = g.round == 0 ? 0 : g.roundStart + g.payWindow;
        v.pot = g.pot;
        v.paidCount = roundPaidCount[id][g.round];
        v.members = g.members;
    }

    function getMembers(uint256 id) external view returns (MemberView[] memory list) {
        Group storage g = groups[id];
        list = new MemberView[](g.members.length);
        for (uint256 i = 0; i < g.members.length; i++) {
            address a = g.members[i];
            Member storage m = memberInfo[id][a];
            RoundState storage rs = roundState[id][g.round][a];
            list[i] = MemberView({
                account: a,
                nickname: m.nickname,
                received: m.received,
                receivedRound: m.receivedRound,
                lateCount: m.lateCount,
                withdrawn: m.withdrawn,
                collateralLeft: m.collateralLeft,
                paid: rs.paid,
                covered: rs.covered,
                excuse: rs.excuse,
                decided: rs.decided,
                flagged: rs.flagged,
                extendedUntil: rs.extendedUntil
            });
        }
    }

    function activityCount(uint256 id) external view returns (uint256) {
        return activities[id].length;
    }

    /// @notice Son `count` etkinliği yeniden eskiye döndürür.
    function getRecentActivities(uint256 id, uint256 count) external view returns (Activity[] memory list) {
        Activity[] storage all = activities[id];
        uint256 n = count < all.length ? count : all.length;
        list = new Activity[](n);
        for (uint256 i = 0; i < n; i++) {
            list[i] = all[all.length - 1 - i];
        }
    }

    function groupsOf(address who) external view returns (uint256[] memory) {
        return userGroups[who];
    }

    // ---------------------------------------------------------------------

    function _log(uint256 id, Kind kind, address actor, address subject, uint256 amount, string memory text) internal {
        activities[id].push(
            Activity({
                kind: kind,
                actor: actor,
                subject: subject,
                amount: amount,
                time: uint64(block.timestamp),
                blockNumber: uint64(block.number),
                text: text
            })
        );
        emit ActivityLogged(id, activities[id].length - 1, kind, actor, subject, amount, text);
    }
}
