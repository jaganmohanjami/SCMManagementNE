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
import connectPg from "connect-pg-simple";
import { IStorage } from "./storage";
import { eq, and, desc, sql, asc, gt, lt, like, isNull, not } from "drizzle-orm";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  public sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // Suppliers
  async getSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).orderBy(asc(suppliers.companyName));
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id));
    return supplier;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values(supplier).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updatedSupplier] = await db
      .update(suppliers)
      .set(supplier)
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return true; // If no error was thrown, the deletion was successful
  }

  // Agreements
  async getAgreements(): Promise<Agreement[]> {
    return await db.select().from(agreements).orderBy(desc(agreements.updatedAt));
  }

  async getAgreement(id: number): Promise<Agreement | undefined> {
    const [agreement] = await db.select().from(agreements).where(eq(agreements.id, id));
    return agreement;
  }

  async getAgreementsBySupplier(supplierId: number): Promise<Agreement[]> {
    return await db
      .select()
      .from(agreements)
      .where(eq(agreements.supplierId, supplierId))
      .orderBy(desc(agreements.updatedAt));
  }

  async createAgreement(agreement: InsertAgreement): Promise<Agreement> {
    const [newAgreement] = await db
      .insert(agreements)
      .values(agreement)
      .returning();
    return newAgreement;
  }

  async updateAgreement(id: number, agreement: Partial<InsertAgreement>): Promise<Agreement | undefined> {
    const [updatedAgreement] = await db
      .update(agreements)
      .set(agreement)
      .where(eq(agreements.id, id))
      .returning();
    return updatedAgreement;
  }

  async deleteAgreement(id: number): Promise<boolean> {
    await db.delete(agreements).where(eq(agreements.id, id));
    return true;
  }

  // Price Lists
  async getPriceLists(agreementId: number): Promise<PriceList[]> {
    return await db
      .select()
      .from(priceLists)
      .where(eq(priceLists.agreementId, agreementId))
      .orderBy(asc(priceLists.itemNumber));
  }

  async getPriceListItem(id: number): Promise<PriceList | undefined> {
    const [item] = await db.select().from(priceLists).where(eq(priceLists.id, id));
    return item;
  }

  async createPriceList(priceList: InsertPriceList): Promise<PriceList> {
    const [newPriceList] = await db
      .insert(priceLists)
      .values(priceList)
      .returning();
    return newPriceList;
  }

  async createPriceLists(priceLists: InsertPriceList[]): Promise<PriceList[]> {
    if (priceLists.length === 0) return [];
    return await db
      .insert(priceLists)
      .values(priceLists)
      .returning();
  }

  async deletePriceListsForAgreement(agreementId: number): Promise<boolean> {
    await db.delete(priceLists).where(eq(priceLists.agreementId, agreementId));
    return true;
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db
      .insert(projects)
      .values(project)
      .returning();
    return newProject;
  }

  // Service Tickets
  async getServiceTickets(): Promise<ServiceTicket[]> {
    return await db.select().from(serviceTickets).orderBy(serviceTickets.createdAt, { direction: 'desc' });
  }

  async getServiceTicket(id: number): Promise<ServiceTicket | undefined> {
    const [ticket] = await db.select().from(serviceTickets).where(eq(serviceTickets.id, id));
    return ticket;
  }

  async getServiceTicketItems(ticketId: number): Promise<TicketItem[]> {
    return await db
      .select()
      .from(ticketItems)
      .where(eq(ticketItems.ticketId, ticketId));
  }

  async createServiceTicket(ticket: InsertServiceTicket): Promise<ServiceTicket> {
    const [newTicket] = await db
      .insert(serviceTickets)
      .values(ticket)
      .returning();
    return newTicket;
  }

  async updateServiceTicket(id: number, ticket: Partial<InsertServiceTicket>): Promise<ServiceTicket | undefined> {
    const [updatedTicket] = await db
      .update(serviceTickets)
      .set(ticket)
      .where(eq(serviceTickets.id, id))
      .returning();
    return updatedTicket;
  }

  async createTicketItem(item: InsertTicketItem): Promise<TicketItem> {
    const [newItem] = await db
      .insert(ticketItems)
      .values(item)
      .returning();
    return newItem;
  }

  // Claims
  async getClaims(): Promise<Claim[]> {
    return await db.select().from(claims).orderBy(desc(claims.dateEntered));
  }

  async getClaim(id: number): Promise<Claim | undefined> {
    const [claim] = await db.select().from(claims).where(eq(claims.id, id));
    return claim;
  }

  async createClaim(claim: InsertClaim): Promise<Claim> {
    const [newClaim] = await db
      .insert(claims)
      .values(claim)
      .returning();
    return newClaim;
  }

  async updateClaim(id: number, claim: Partial<InsertClaim>): Promise<Claim | undefined> {
    const [updatedClaim] = await db
      .update(claims)
      .set(claim)
      .where(eq(claims.id, id))
      .returning();
    return updatedClaim;
  }

  // Supplier Ratings
  async getSupplierRatings(): Promise<SupplierRating[]> {
    return await db.select().from(supplierRatings).orderBy(desc(supplierRatings.ratingDate));
  }

  async getSupplierRatingsBySupplier(supplierId: number): Promise<SupplierRating[]> {
    return await db
      .select()
      .from(supplierRatings)
      .where(eq(supplierRatings.supplierId, supplierId))
      .orderBy(desc(supplierRatings.ratingDate));
  }

  async createSupplierRating(rating: InsertSupplierRating): Promise<SupplierRating> {
    const [newRating] = await db
      .insert(supplierRatings)
      .values(rating)
      .returning();
    return newRating;
  }

  // File Uploads
  async createFileUpload(file: InsertFileUpload): Promise<FileUpload> {
    const [newFile] = await db
      .insert(fileUploads)
      .values(file)
      .returning();
    return newFile;
  }

  async getFileUploads(entityType: string, entityId: number): Promise<FileUpload[]> {
    return await db
      .select()
      .from(fileUploads)
      .where(
        and(
          eq(fileUploads.entityType, entityType),
          eq(fileUploads.entityId, entityId)
        )
      )
      .orderBy(desc(fileUploads.uploadDate));
  }

  // Activity Logs
  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db
      .insert(activityLogs)
      .values(log)
      .returning();
    return newLog;
  }

  async getRecentActivity(): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(activityLogs)
      .orderBy(desc(activityLogs.timestamp))
      .limit(50);
  }
}