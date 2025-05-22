import { pgTable, text, serial, integer, timestamp, date, numeric, unique, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(), // "purchasing", "operations", "accounting", "legal", "management", "supplier"
  companyId: integer("company_id").references(() => suppliers.id, { onDelete: "set null" }),
});

// Suppliers
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  address: text("address"),
  sapSupplierNumber: text("sap_supplier_number"),
  contactName1: text("contact_name_1"),
  email1: text("email_1"),
  contactName2: text("contact_name_2"),
  email2: text("email_2"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Agreements (Contracts)
export const agreements = pgTable("agreements", {
  id: serial("id").primaryKey(),
  agreementNumber: text("agreement_number").notNull().unique(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  agreementDescription: text("agreement_description"),
  materialGroupNumber: text("material_group_number"),
  serviceArea: text("service_area"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  paymentTerms: text("payment_terms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Price Lists
export const priceLists = pgTable("price_lists", {
  id: serial("id").primaryKey(),
  agreementId: integer("agreement_id").notNull().references(() => agreements.id),
  validFrom: date("valid_from"),
  validTo: date("valid_to"),
  itemNumber: text("item_number"),
  outlineLevel: integer("outline_level"),
  positionNumber: text("position_number"),
  shortText: text("short_text"),
  longText: text("long_text"),
  grossPrice: numeric("gross_price"),
  currency: text("currency"),
  unitOfMeasure: text("unit_of_measure"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Projects
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  projectNumber: text("project_number").notNull(),
  projectName: text("project_name").notNull(),
  projectArea: text("project_area"),
  startDate: date("start_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Service Delivery Tickets
export const serviceTickets = pgTable("service_tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  agreementId: integer("agreement_id").references(() => agreements.id),
  dateCreated: timestamp("date_created").defaultNow().notNull(),
  dateSubmitted: timestamp("date_submitted"),
  dateApproved: timestamp("date_approved"),
  status: text("status").notNull(), // "draft", "submitted", "approved", "rejected"
  totalValue: numeric("total_value"),
  createdBy: integer("created_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
});

// Service Ticket Items
export const ticketItems = pgTable("ticket_items", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").notNull().references(() => serviceTickets.id),
  priceListItemId: integer("price_list_item_id").references(() => priceLists.id),
  positionDate: date("position_date"),
  quantity: numeric("quantity"),
  price: numeric("price"),
  totalPrice: numeric("total_price"),
  description: text("description"),
  isNew: boolean("is_new").default(false),
});

// Claims
export const claims = pgTable("claims", {
  id: serial("id").primaryKey(),
  claimNumber: text("claim_number").notNull().unique(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  projectId: integer("project_id").references(() => projects.id),
  dateHappened: date("date_happened"),
  dateEntered: timestamp("date_entered").defaultNow().notNull(),
  dateApproved: timestamp("date_approved"),
  dateSentToSupplier: timestamp("date_sent_to_supplier"),
  dateFeedback: timestamp("date_feedback"),
  claimInfo: text("claim_info"),
  claimArea: text("claim_area"), // "Material", "Service", "HSE"
  damageText: text("damage_text"),
  damageAmount: numeric("damage_amount"),
  statusText: text("status_text"),
  agreementId: integer("agreement_id").references(() => agreements.id),
  orderNumber: text("order_number"),
  defectsDescription: text("defects_description"),
  demandType: text("demand_type"), // Different types as per requirements
  demandText: text("demand_text"),
  acceptedBySupplier: boolean("accepted_by_supplier"),
  acceptedSupplierText: text("accepted_supplier_text"),
  files: json("files").default([]),
  createdBy: integer("created_by").references(() => users.id),
});

// Supplier Ratings
export const supplierRatings = pgTable("supplier_ratings", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliers.id),
  projectId: integer("project_id").notNull().references(() => projects.id),
  jobDescription: text("job_description"), // Description of the specific job being rated
  requestDate: timestamp("request_date"), // Date when supplier requested a rating
  ratingDate: timestamp("rating_date").defaultNow().notNull(),
  overallText: text("overall_text"),
  hseRating: integer("hse_rating"), // 1-5
  communicationRating: integer("communication_rating"), // 1-5
  competencyRating: integer("competency_rating"), // 1-5
  onTimeRating: integer("on_time_rating"), // 1-5
  serviceRating: integer("service_rating"), // 1-5
  overallRating: numeric("overall_rating"),
  acceptedBySupplier: boolean("accepted_by_supplier"), // Whether supplier has accepted the rating
  acceptedDate: timestamp("accepted_date"), // When supplier accepted the rating
  supplierComment: text("supplier_comment"), // Supplier's response when accepting
  createdBy: integer("created_by").references(() => users.id),
});

// File Uploads
export const fileUploads = pgTable("file_uploads", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  entityType: text("entity_type").notNull(), // "supplier", "claim", etc.
  entityId: integer("entity_id").notNull(),
  isVisibleToSupplier: boolean("is_visible_to_supplier").default(false),
  uploadDate: timestamp("upload_date").defaultNow().notNull(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
});

// Activity Log
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id"),
  details: json("details"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true, 
  createdAt: true, 
  updatedAt: true
});

export const insertAgreementSchema = createInsertSchema(agreements).omit({
  id: true, 
  createdAt: true, 
  updatedAt: true
});

export const insertPriceListSchema = createInsertSchema(priceLists).omit({
  id: true, 
  createdAt: true
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true, 
  createdAt: true
});

export const insertServiceTicketSchema = createInsertSchema(serviceTickets).omit({
  id: true, 
  ticketNumber: true, 
  dateCreated: true, 
  totalValue: true
});

export const insertTicketItemSchema = createInsertSchema(ticketItems).omit({
  id: true
});

export const insertClaimSchema = createInsertSchema(claims).omit({
  id: true, 
  claimNumber: true, 
  dateEntered: true, 
  files: true
});

export const insertSupplierRatingSchema = createInsertSchema(supplierRatings).omit({
  id: true, 
  ratingDate: true, 
  overallRating: true,
  acceptedBySupplier: true,
  acceptedDate: true
}).extend({
  jobDescription: z.string().min(5, "Job description must be at least 5 characters"),
  supplierComment: z.string().optional()
});

export const insertFileUploadSchema = createInsertSchema(fileUploads).omit({
  id: true, 
  uploadDate: true
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({
  id: true, 
  timestamp: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertAgreement = z.infer<typeof insertAgreementSchema>;
export type Agreement = typeof agreements.$inferSelect;

export type InsertPriceList = z.infer<typeof insertPriceListSchema>;
export type PriceList = typeof priceLists.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertServiceTicket = z.infer<typeof insertServiceTicketSchema>;
export type ServiceTicket = typeof serviceTickets.$inferSelect;

export type InsertTicketItem = z.infer<typeof insertTicketItemSchema>;
export type TicketItem = typeof ticketItems.$inferSelect;

export type InsertClaim = z.infer<typeof insertClaimSchema>;
export type Claim = typeof claims.$inferSelect;

export type InsertSupplierRating = z.infer<typeof insertSupplierRatingSchema>;
export type SupplierRating = typeof supplierRatings.$inferSelect;

export type InsertFileUpload = z.infer<typeof insertFileUploadSchema>;
export type FileUpload = typeof fileUploads.$inferSelect;

export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLogs.$inferSelect;
