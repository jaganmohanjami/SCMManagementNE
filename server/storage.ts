import { 
  users, type User, type InsertUser,
  suppliers, type Supplier, type InsertSupplier,
  agreements, type Agreement, type InsertAgreement,
  priceLists, type PriceList, type InsertPriceList,
  projects, type Project, type InsertProject,
  serviceTickets, type ServiceTicket, type InsertServiceTicket,
  ticketItems, type TicketItem, type InsertTicketItem,
  claims, type Claim, type InsertClaim,
  supplierRatings, type SupplierRating, type InsertSupplierRating,
  fileUploads, type FileUpload, type InsertFileUpload,
  activityLogs, type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import session from "express-session";
import { DatabaseStorage } from "./database-storage";

// Interface for storage operations
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Suppliers
  getSuppliers(): Promise<Supplier[]>;
  getSupplier(id: number): Promise<Supplier | undefined>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;
  
  // Agreements
  getAgreements(): Promise<Agreement[]>;
  getAgreement(id: number): Promise<Agreement | undefined>;
  getAgreementsBySupplier(supplierId: number): Promise<Agreement[]>;
  createAgreement(agreement: InsertAgreement): Promise<Agreement>;
  updateAgreement(id: number, agreement: Partial<InsertAgreement>): Promise<Agreement | undefined>;
  deleteAgreement(id: number): Promise<boolean>;
  
  // Price Lists
  getPriceLists(agreementId: number): Promise<PriceList[]>;
  getPriceListItem(id: number): Promise<PriceList | undefined>;
  createPriceList(priceList: InsertPriceList): Promise<PriceList>;
  createPriceLists(priceLists: InsertPriceList[]): Promise<PriceList[]>;
  deletePriceListsForAgreement(agreementId: number): Promise<boolean>;
  
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  
  // Service Tickets
  getServiceTickets(): Promise<ServiceTicket[]>;
  getServiceTicket(id: number): Promise<ServiceTicket | undefined>;
  getServiceTicketItems(ticketId: number): Promise<TicketItem[]>;
  createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket>;
  updateServiceTicket(id: number, ticket: Partial<InsertServiceTicket>): Promise<ServiceTicket | undefined>;
  createTicketItem(item: InsertTicketItem): Promise<TicketItem>;
  
  // Claims
  getClaims(): Promise<Claim[]>;
  getClaim(id: number): Promise<Claim | undefined>;
  createClaim(claim: InsertClaim): Promise<Claim>;
  updateClaim(id: number, claim: Partial<InsertClaim>): Promise<Claim | undefined>;
  
  // Supplier Ratings
  getSupplierRatings(): Promise<SupplierRating[]>;
  getSupplierRatingsBySupplier(supplierId: number): Promise<SupplierRating[]>;
  createSupplierRating(rating: InsertSupplierRating): Promise<SupplierRating>;
  
  // File Uploads
  createFileUpload(file: InsertFileUpload): Promise<FileUpload>;
  getFileUploads(entityType: string, entityId: number): Promise<FileUpload[]>;
  
  // Activity Logs
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  getRecentActivity(): Promise<ActivityLog[]>;
  
  // Session Store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private suppliers: Map<number, Supplier>;
  private agreements: Map<number, Agreement>;
  private priceLists: Map<number, PriceList>;
  private projects: Map<number, Project>;
  private serviceTickets: Map<number, ServiceTicket>;
  private ticketItems: Map<number, TicketItem>;
  private claims: Map<number, Claim>;
  private supplierRatings: Map<number, SupplierRating>;
  private fileUploads: Map<number, FileUpload>;
  private activityLogs: Map<number, ActivityLog>;
  
  private nextUserID: number = 1;
  private nextSupplierID: number = 1;
  private nextAgreementID: number = 1;
  private nextPriceListID: number = 1;
  private nextProjectID: number = 1;
  private nextServiceTicketID: number = 1;
  private nextTicketItemID: number = 1;
  private nextClaimID: number = 1;
  private nextSupplierRatingID: number = 1;
  private nextFileUploadID: number = 1;
  private nextActivityLogID: number = 1;
  
  public sessionStore: session.SessionStore;
  
  constructor() {
    this.users = new Map();
    this.suppliers = new Map();
    this.agreements = new Map();
    this.priceLists = new Map();
    this.projects = new Map();
    this.serviceTickets = new Map();
    this.ticketItems = new Map();
    this.claims = new Map();
    this.supplierRatings = new Map();
    this.fileUploads = new Map();
    this.activityLogs = new Map();
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // prune expired entries every 24h
    });
    
    // Initialize with some sample data
    this.initSampleData();
  }
  
  private initSampleData() {
    // Add sample projects
    this.createProject({
      projectNumber: "PRJ-2023-001",
      projectName: "North Sea Platform Alpha",
      projectArea: "North Sea",
      startDate: new Date("2023-01-01"),
    });
    
    this.createProject({
      projectNumber: "PRJ-2023-002",
      projectName: "South Field Development",
      projectArea: "South Field",
      startDate: new Date("2023-02-15"),
    });
    
    this.createProject({
      projectNumber: "PRJ-2023-003",
      projectName: "West Field Operations",
      projectArea: "West Field",
      startDate: new Date("2023-03-10"),
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const id = this.nextUserID++;
    const newUser: User = { ...user, id };
    this.users.set(id, newUser);
    return newUser;
  }
  
  // Supplier methods
  async getSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }
  
  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }
  
  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = this.nextSupplierID++;
    const now = new Date();
    const newSupplier: Supplier = { 
      ...supplier, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.suppliers.set(id, newSupplier);
    
    // Log activity
    this.createActivityLog({
      userId: 1, // Default user ID
      action: "create",
      entityType: "supplier",
      entityId: id,
      details: { name: supplier.companyName }
    });
    
    return newSupplier;
  }
  
  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const existing = this.suppliers.get(id);
    if (!existing) return undefined;
    
    const updated: Supplier = { 
      ...existing, 
      ...supplier, 
      updatedAt: new Date() 
    };
    this.suppliers.set(id, updated);
    
    // Log activity
    this.createActivityLog({
      userId: 1, // Default user ID
      action: "update",
      entityType: "supplier",
      entityId: id,
      details: { name: updated.companyName }
    });
    
    return updated;
  }
  
  async deleteSupplier(id: number): Promise<boolean> {
    const supplier = this.suppliers.get(id);
    if (!supplier) return false;
    
    this.suppliers.delete(id);
    
    // Log activity
    this.createActivityLog({
      userId: 1, // Default user ID
      action: "delete",
      entityType: "supplier",
      entityId: id,
      details: { name: supplier.companyName }
    });
    
    return true;
  }
  
  // Agreement methods
  async getAgreements(): Promise<Agreement[]> {
    return Array.from(this.agreements.values());
  }
  
  async getAgreement(id: number): Promise<Agreement | undefined> {
    return this.agreements.get(id);
  }
  
  async getAgreementsBySupplier(supplierId: number): Promise<Agreement[]> {
    return Array.from(this.agreements.values()).filter(
      (agreement) => agreement.supplierId === supplierId
    );
  }
  
  async createAgreement(agreement: InsertAgreement): Promise<Agreement> {
    const id = this.nextAgreementID++;
    const now = new Date();
    const newAgreement: Agreement = { 
      ...agreement, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.agreements.set(id, newAgreement);
    
    // Log activity
    this.createActivityLog({
      userId: 1, // Default user ID
      action: "create",
      entityType: "agreement",
      entityId: id,
      details: { number: agreement.agreementNumber }
    });
    
    return newAgreement;
  }
  
  async updateAgreement(id: number, agreement: Partial<InsertAgreement>): Promise<Agreement | undefined> {
    const existing = this.agreements.get(id);
    if (!existing) return undefined;
    
    const updated: Agreement = { 
      ...existing, 
      ...agreement, 
      updatedAt: new Date() 
    };
    this.agreements.set(id, updated);
    
    // Log activity
    this.createActivityLog({
      userId: 1, // Default user ID
      action: "update",
      entityType: "agreement",
      entityId: id,
      details: { number: updated.agreementNumber }
    });
    
    return updated;
  }
  
  async deleteAgreement(id: number): Promise<boolean> {
    const agreement = this.agreements.get(id);
    if (!agreement) return false;
    
    // Delete associated price lists
    await this.deletePriceListsForAgreement(id);
    
    this.agreements.delete(id);
    
    // Log activity
    this.createActivityLog({
      userId: 1, // Default user ID
      action: "delete",
      entityType: "agreement",
      entityId: id,
      details: { number: agreement.agreementNumber }
    });
    
    return true;
  }
  
  // Price List methods
  async getPriceLists(agreementId: number): Promise<PriceList[]> {
    return Array.from(this.priceLists.values()).filter(
      (priceList) => priceList.agreementId === agreementId
    );
  }
  
  async getPriceListItem(id: number): Promise<PriceList | undefined> {
    return this.priceLists.get(id);
  }
  
  async createPriceList(priceList: InsertPriceList): Promise<PriceList> {
    const id = this.nextPriceListID++;
    const newPriceList: PriceList = { 
      ...priceList, 
      id, 
      createdAt: new Date() 
    };
    this.priceLists.set(id, newPriceList);
    return newPriceList;
  }
  
  async createPriceLists(priceLists: InsertPriceList[]): Promise<PriceList[]> {
    const result: PriceList[] = [];
    for (const priceList of priceLists) {
      result.push(await this.createPriceList(priceList));
    }
    return result;
  }
  
  async deletePriceListsForAgreement(agreementId: number): Promise<boolean> {
    const priceLists = Array.from(this.priceLists.values()).filter(
      (priceList) => priceList.agreementId === agreementId
    );
    
    for (const priceList of priceLists) {
      this.priceLists.delete(priceList.id);
    }
    
    return true;
  }
  
  // Project methods
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async createProject(project: InsertProject): Promise<Project> {
    const id = this.nextProjectID++;
    const newProject: Project = { 
      ...project, 
      id, 
      createdAt: new Date() 
    };
    this.projects.set(id, newProject);
    
    // Log activity
    this.createActivityLog({
      userId: 1, // Default user ID
      action: "create",
      entityType: "project",
      entityId: id,
      details: { name: project.projectName }
    });
    
    return newProject;
  }
  
  // Service Ticket methods
  async getServiceTickets(): Promise<ServiceTicket[]> {
    return Array.from(this.serviceTickets.values());
  }
  
  async getServiceTicket(id: number): Promise<ServiceTicket | undefined> {
    return this.serviceTickets.get(id);
  }
  
  async getServiceTicketItems(ticketId: number): Promise<TicketItem[]> {
    return Array.from(this.ticketItems.values()).filter(
      (item) => item.ticketId === ticketId
    );
  }
  
  async createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket> {
    const id = this.nextServiceTicketID++;
    const ticketNumber = `ST-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
    
    const newTicket: ServiceTicket = { 
      ...ticket, 
      id, 
      ticketNumber,
      dateCreated: new Date(),
      totalValue: 0
    };
    this.serviceTickets.set(id, newTicket);
    
    // Log activity
    this.createActivityLog({
      userId: ticket.createdBy || 1,
      action: "create",
      entityType: "serviceTicket",
      entityId: id,
      details: { number: ticketNumber }
    });
    
    return newTicket;
  }
  
  async updateServiceTicket(id: number, ticket: Partial<InsertServiceTicket>): Promise<ServiceTicket | undefined> {
    const existing = this.serviceTickets.get(id);
    if (!existing) return undefined;
    
    const updated: ServiceTicket = { ...existing, ...ticket };
    this.serviceTickets.set(id, updated);
    
    // Log activity
    let action = "update";
    if (ticket.status) {
      if (ticket.status === "submitted") action = "submit";
      else if (ticket.status === "approved") action = "approve";
      else if (ticket.status === "rejected") action = "reject";
    }
    
    this.createActivityLog({
      userId: ticket.approvedBy || existing.createdBy || 1,
      action,
      entityType: "serviceTicket",
      entityId: id,
      details: { number: existing.ticketNumber, status: ticket.status }
    });
    
    return updated;
  }
  
  async createTicketItem(item: InsertTicketItem): Promise<TicketItem> {
    const id = this.nextTicketItemID++;
    const newItem: TicketItem = { ...item, id };
    this.ticketItems.set(id, newItem);
    
    // Update ticket total value
    const ticket = await this.getServiceTicket(item.ticketId);
    if (ticket) {
      const items = await this.getServiceTicketItems(item.ticketId);
      const totalValue = items.reduce((sum, curr) => sum + (Number(curr.totalPrice) || 0), Number(item.totalPrice) || 0);
      await this.updateServiceTicket(item.ticketId, { totalValue });
    }
    
    return newItem;
  }
  
  // Claims methods
  async getClaims(): Promise<Claim[]> {
    return Array.from(this.claims.values());
  }
  
  async getClaim(id: number): Promise<Claim | undefined> {
    return this.claims.get(id);
  }
  
  async createClaim(claim: InsertClaim): Promise<Claim> {
    const id = this.nextClaimID++;
    const claimNumber = `CL-${new Date().getFullYear()}-${String(id).padStart(3, '0')}`;
    
    const newClaim: Claim = { 
      ...claim, 
      id, 
      claimNumber,
      dateEntered: new Date(),
      files: []
    };
    this.claims.set(id, newClaim);
    
    // Log activity
    this.createActivityLog({
      userId: claim.createdBy || 1,
      action: "create",
      entityType: "claim",
      entityId: id,
      details: { number: claimNumber }
    });
    
    return newClaim;
  }
  
  async updateClaim(id: number, claim: Partial<InsertClaim>): Promise<Claim | undefined> {
    const existing = this.claims.get(id);
    if (!existing) return undefined;
    
    const updated: Claim = { ...existing, ...claim };
    this.claims.set(id, updated);
    
    // Log activity
    this.createActivityLog({
      userId: claim.createdBy || existing.createdBy || 1,
      action: "update",
      entityType: "claim",
      entityId: id,
      details: { number: existing.claimNumber }
    });
    
    return updated;
  }
  
  // Supplier Rating methods
  async getSupplierRatings(): Promise<SupplierRating[]> {
    return Array.from(this.supplierRatings.values());
  }
  
  async getSupplierRatingsBySupplier(supplierId: number): Promise<SupplierRating[]> {
    return Array.from(this.supplierRatings.values()).filter(
      (rating) => rating.supplierId === supplierId
    );
  }
  
  async createSupplierRating(rating: InsertSupplierRating): Promise<SupplierRating> {
    const id = this.nextSupplierRatingID++;
    
    // Calculate overall rating (average of all ratings)
    const ratingValues = [
      rating.hseRating || 0,
      rating.communicationRating || 0,
      rating.competencyRating || 0,
      rating.onTimeRating || 0,
      rating.serviceRating || 0
    ];
    const overallRating = ratingValues.reduce((sum, val) => sum + val, 0) / ratingValues.filter(val => val > 0).length;
    
    const newRating: SupplierRating = { 
      ...rating, 
      id, 
      ratingDate: new Date(),
      overallRating
    };
    this.supplierRatings.set(id, newRating);
    
    // Log activity
    this.createActivityLog({
      userId: rating.createdBy || 1,
      action: "create",
      entityType: "supplierRating",
      entityId: id,
      details: { supplierId: rating.supplierId, overallRating }
    });
    
    return newRating;
  }
  
  // File Upload methods
  async createFileUpload(file: InsertFileUpload): Promise<FileUpload> {
    const id = this.nextFileUploadID++;
    const newFile: FileUpload = { 
      ...file, 
      id, 
      uploadDate: new Date() 
    };
    this.fileUploads.set(id, newFile);
    
    // If this is for a claim, update the claim's files array
    if (file.entityType === "claim") {
      const claim = await this.getClaim(file.entityId);
      if (claim) {
        const files = [...(claim.files as any[] || []), { id, name: file.fileName }];
        await this.updateClaim(file.entityId, { files } as any);
      }
    }
    
    return newFile;
  }
  
  async getFileUploads(entityType: string, entityId: number): Promise<FileUpload[]> {
    return Array.from(this.fileUploads.values()).filter(
      (file) => file.entityType === entityType && file.entityId === entityId
    );
  }
  
  // Activity Log methods
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.nextActivityLogID++;
    const newLog: ActivityLog = { 
      ...log, 
      id, 
      timestamp: new Date() 
    };
    this.activityLogs.set(id, newLog);
    return newLog;
  }
  
  async getRecentActivity(): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }
}

export const storage = new DatabaseStorage();
