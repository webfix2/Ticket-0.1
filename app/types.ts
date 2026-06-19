export interface User {
  sn: string;
  userId: string;
  admin: string;
  senderName: string;
  senderEmail: string;
  userPlatform: string;
  timestamp: string;
  fullName: string;
  phoneNumber: string;
  emailAddress: string;
  ticketId: string;
  seatNumbers: string;
  transferringSeatNumbers?: string;
  coverImage: string;
  eventName: string;
  dateTime: string;
  doorTime: string;
  venue: string;
  location: string;
  section: string;
  sectionNo: string;
  row: string;
  gate?: string;
  entrance?: string;
  hospitalityArea?: string;
  ticketHolder?: string;
  ageRestriction: string;
  description: string;
  terms: string;
  eventStatus: string;
  ticketStatus: string;
  link: string;
  ticketFolderId: string;
  approvalSTAMP: string;
  completedSTAMP: string;
  returnedSTAMP: string;
  route: string;
  titleStatus: string;
  messageStatus: string;
  warningStatus: string;
  systemStatus: string;
  percentageStatus: string;
  adminStatus: string;
  adminSMSStatus: string;
  paymentSettings?: string;
  paymentSTAMP?: string;
  paymentAmount?: string;
  token?: string;
}

export interface Ticket {
  sn: string;
  admin: string;
  ticketId: string;
  coverImage: string;
  eventName: string;
  dateTime: string;
  doorTime: string;
  venue: string;
  location: string;
  section: string;
  sectionNo: string;
  row: string;
  gate?: string;
  entrance?: string;
  hospitalityArea?: string;
  category?: string;
  ticketHolder?: string;
  ticketFolderId: string;
  ageRestriction: string;
  description: string;
  terms: string;
  newSTAMP: string;
  deletedSTAMP: string;
  eventStatus: string;
  ticketStatus: string;
  platform: string;
  seatNumbers?: string;
  seat?: string;
  paymentSettings?: string;
}

export interface CryptoWallets {
  btc?: string;
  eth?: string;
  trc?: string;
  usdt?: string;
  [key: string]: string | undefined;
}

export interface PaymentSettings {
  applePayNumber?: string;
  paypal?: string;
  cryptoWallets?: CryptoWallets;
}

export interface Admin {
  sn: string;
  role: 'OWNER' | 'CUSTOMER';
  allowedPlatform: string;
  adminId: string;
  username: string;
  password: string;
  accountName: string;
  accountEmail: string;
  accountStateCountry: string;
  accountState?: string;
  accountCountry?: string;
  allowPayment: string;
  adminSettings: string;
  plan: string;
  subscriptionExpiry: string;
  status: string;
  token?: string;
}