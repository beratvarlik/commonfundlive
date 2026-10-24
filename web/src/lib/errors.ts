import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from "viem";

const contractErrors: Record<string, string> = {
  WrongAmount: "Gönderilen tutar beklenenle aynı değil. Sayfayı yenileyip tekrar dene.",
  WrongStatus: "Grup bu işlem için uygun durumda değil. Sayfayı yenile.",
  NotMember: "Bu grubun üyesi değilsin.",
  AlreadyMember: "Bu gruba zaten katıldın.",
  GroupFull: "Grup dolu; yeni üye alınmıyor.",
  AlreadyPaid: "Bu turun taksiti zaten ödendi.",
  NotLateYet: "Son ödeme günü henüz geçmedi.",
  NoExcuse: "Önce mazeret yazılmalı.",
  AlreadyDecided: "Bu konuda karar zaten verildi.",
  AlreadyDone: "Bu işlem zaten yapılmış.",
  NotEveryonePaid: "Herkesin taksiti gelmeden kura çekilemez.",
  BadParams: "Girilen bilgiler geçersiz. Alanları kontrol et.",
  NotMuhtar: "Bu işlemi yalnızca Muhtar yapabilir.",
  NotBekci: "Bu işlemi yalnızca Bekçi yapabilir.",
  TransferFailed: "Gönderim başarısız oldu. Tekrar dene.",
  Reentrancy: "İşlem reddedildi. Tekrar dene.",
};

/** Cüzdan ve sözleşme hatalarını kullanıcıya ne olduğunu ve ne yapacağını söyleyen Türkçe cümleye çevirir. */
export function friendlyError(e: unknown): string {
  if (e instanceof BaseError) {
    const rejected = e.walk((x) => x instanceof UserRejectedRequestError);
    if (rejected) return "İşlemi cüzdanında onaylamadın. Hazır olduğunda tekrar dene.";
    const reverted = e.walk((x) => x instanceof ContractFunctionRevertedError);
    if (reverted instanceof ContractFunctionRevertedError) {
      const name = reverted.data?.errorName;
      if (name && contractErrors[name]) return contractErrors[name];
    }
    const msg = (e.details || e.shortMessage || e.message || "").toLowerCase();
    if (msg.includes("insufficient funds") || msg.includes("insufficient balance"))
      return "Cüzdanında yeterli MON yok. Deneme ağı musluğundan MON alıp tekrar dene.";
    if (msg.includes("user rejected") || msg.includes("user denied"))
      return "İşlemi cüzdanında onaylamadın. Hazır olduğunda tekrar dene.";
    return e.shortMessage || "İşlem tamamlanamadı. Tekrar dene.";
  }
  if (e && typeof e === "object" && "code" in e && (e as { code: number }).code === 4001)
    return "İşlemi cüzdanında onaylamadın. Hazır olduğunda tekrar dene.";
  if (e instanceof Error) return e.message;
  return "Beklenmeyen bir hata oldu. Tekrar dene.";
}
