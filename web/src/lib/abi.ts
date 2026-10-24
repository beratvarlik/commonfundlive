// Bu dosya contracts/scripts/export-abi.js ile üretilir. Elle düzenleme.
export const commonFundAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_muhtar",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "_bekci",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyDecided",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyDone",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyMember",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "AlreadyPaid",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "BadParams",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "GroupFull",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoExcuse",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotBekci",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotEveryonePaid",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotLateYet",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotMember",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotMuhtar",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Reentrancy",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "TransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "WrongStatus",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "groupId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "enum CommonFund.Kind",
        "name": "kind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "actor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "subject",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "text",
        "type": "string"
      }
    ],
    "name": "ActivityLogged",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "activityCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "bekci",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "size",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "installment",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "collateral",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "payWindow",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "period",
        "type": "uint64"
      },
      {
        "internalType": "uint64",
        "name": "maxExtension",
        "type": "uint64"
      },
      {
        "internalType": "string",
        "name": "nickname",
        "type": "string"
      }
    ],
    "name": "createGroup",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "deadline",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "draw",
    "outputs": [
      {
        "internalType": "address",
        "name": "winner",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "member",
        "type": "address"
      }
    ],
    "name": "enforceLate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "member",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "message",
        "type": "string"
      }
    ],
    "name": "flagLate",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getGroup",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "uint8",
            "name": "size",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "installment",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "collateral",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "payWindow",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "period",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "maxExtension",
            "type": "uint64"
          },
          {
            "internalType": "enum CommonFund.Status",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "round",
            "type": "uint8"
          },
          {
            "internalType": "uint64",
            "name": "roundStart",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "deadline",
            "type": "uint64"
          },
          {
            "internalType": "uint256",
            "name": "pot",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "paidCount",
            "type": "uint256"
          },
          {
            "internalType": "address[]",
            "name": "members",
            "type": "address[]"
          }
        ],
        "internalType": "struct CommonFund.GroupView",
        "name": "v",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "getMembers",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "string",
            "name": "nickname",
            "type": "string"
          },
          {
            "internalType": "bool",
            "name": "received",
            "type": "bool"
          },
          {
            "internalType": "uint8",
            "name": "receivedRound",
            "type": "uint8"
          },
          {
            "internalType": "uint8",
            "name": "lateCount",
            "type": "uint8"
          },
          {
            "internalType": "bool",
            "name": "withdrawn",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "collateralLeft",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "paid",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "covered",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "excuse",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "decided",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "flagged",
            "type": "bool"
          },
          {
            "internalType": "uint64",
            "name": "extendedUntil",
            "type": "uint64"
          }
        ],
        "internalType": "struct CommonFund.MemberView[]",
        "name": "list",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "count",
        "type": "uint256"
      }
    ],
    "name": "getRecentActivities",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum CommonFund.Kind",
            "name": "kind",
            "type": "uint8"
          },
          {
            "internalType": "address",
            "name": "actor",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "subject",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "amount",
            "type": "uint256"
          },
          {
            "internalType": "uint64",
            "name": "time",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "blockNumber",
            "type": "uint64"
          },
          {
            "internalType": "string",
            "name": "text",
            "type": "string"
          }
        ],
        "internalType": "struct CommonFund.Activity[]",
        "name": "list",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "member",
        "type": "address"
      },
      {
        "internalType": "uint64",
        "name": "extraSeconds",
        "type": "uint64"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "grantExtension",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "groupCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "who",
        "type": "address"
      }
    ],
    "name": "groupsOf",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "nickname",
        "type": "string"
      }
    ],
    "name": "join",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "memberInfo",
    "outputs": [
      {
        "internalType": "bool",
        "name": "joined",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "received",
        "type": "bool"
      },
      {
        "internalType": "uint8",
        "name": "receivedRound",
        "type": "uint8"
      },
      {
        "internalType": "uint8",
        "name": "lateCount",
        "type": "uint8"
      },
      {
        "internalType": "bool",
        "name": "withdrawn",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "collateralLeft",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "nickname",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "muhtar",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "payInstallment",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "roundPaidCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "roundState",
    "outputs": [
      {
        "internalType": "bool",
        "name": "paid",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "covered",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "excuse",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "decided",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "flagged",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "lateCounted",
        "type": "bool"
      },
      {
        "internalType": "uint64",
        "name": "extendedUntil",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "name": "roundWinner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "member",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "slashCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "text",
        "type": "string"
      }
    ],
    "name": "submitExcuse",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "topUpCollateral",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "withdrawCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
