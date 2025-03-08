export interface User {
  sn: string;
  userId: string;
  admin: string;
  senderName: string;
  senderEmail: string;
  timestamp: string;
  fullName: string;
  phoneNumber: string;
  emailAddress: string;
  ticketId: string;
  seatNumbers: string;
  coverImage: string;
  eventName: string;
  dateTime: string;
  doorTime: string;
  venue: string;
  location: string;
  section: string;
  sectionNo: string;
  row: string;
  ageRestriction: string;
  description: string;
  terms: string;
  eventStatus: string;
  ticketStatus: string;
  link: string;
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
  ticketFolderId: string;
  ageRestriction: string;
  description: string;
  terms: string;
  newSTAMP: string;
  deletedSTAMP: string;
  eventStatus: string;
  ticketStatus: string;
}