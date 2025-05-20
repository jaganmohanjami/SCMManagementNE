import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import multer from "multer";
import path from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import { 
  insertSupplierSchema,
  insertAgreementSchema,
  insertPriceListSchema,
  insertProjectSchema,
  insertServiceTicketSchema,
  insertTicketItemSchema,
  insertClaimSchema,
  insertSupplierRatingSchema,
  insertFileUploadSchema,
} from "@shared/schema";

// Set up file uploads
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueName = `${randomUUID()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  })
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Unauthorized" });
  };
  
  // Get current user info with role
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    res.json(req.user);
  });
  
  // Recent activity
  app.get("/api/activity", isAuthenticated, async (req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      
      const enrichedActivity = await Promise.all(activity.map(async (item) => {
        let entity = {};
        
        if (item.entityType === "supplier" && item.entityId) {
          entity = await storage.getSupplier(item.entityId) || {};
        } else if (item.entityType === "agreement" && item.entityId) {
          entity = await storage.getAgreement(item.entityId) || {};
        } else if (item.entityType === "serviceTicket" && item.entityId) {
          entity = await storage.getServiceTicket(item.entityId) || {};
        } else if (item.entityType === "claim" && item.entityId) {
          entity = await storage.getClaim(item.entityId) || {};
        } else if (item.entityType === "supplierRating" && item.entityId) {
          entity = await storage.getSupplierRating(item.entityId) || {};
        }
        
        return { ...item, entity };
      }));
      
      res.json(enrichedActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });
  
  // Dashboard statistics
  app.get("/api/dashboard/stats", isAuthenticated, async (req, res) => {
    try {
      // Default values for a new database
      const metrics = {
        activeSuppliers: 0,
        activeAgreements: 0,
        openClaims: 0,
        recentTickets: 0,
        pendingApproval: 0
      };
      
      const claimsAnalytics = {
        total: 0,
        totalValue: 0,
        byType: {
          material: { count: 0, value: 0 },
          service: { count: 0, value: 0 },
          hse: { count: 0, value: 0 }
        }
      };
      
      const topSuppliers: Array<{supplierId: number, supplierName: string, rating: number}> = [];
      
      res.json({
        metrics,
        topSuppliers,
        claimsAnalytics
      });
    } catch (error) {
      console.error("Error in dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });
  
  // Suppliers
  app.get("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const suppliers = await storage.getSuppliers();
      console.log("Fetched suppliers:", suppliers);
      res.json(suppliers || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      res.status(500).json({ message: "Failed to fetch suppliers" });
    }
  });
  
  app.get("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const supplier = await storage.getSupplier(parseInt(req.params.id));
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      res.json(supplier);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch supplier" });
    }
  });
  
  app.post("/api/suppliers", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSupplierSchema.parse(req.body);
      const newSupplier = await storage.createSupplier(validatedData);
      res.status(201).json(newSupplier);
    } catch (error) {
      res.status(400).json({ message: "Invalid supplier data" });
    }
  });
  
  app.put("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSupplierSchema.partial().parse(req.body);
      const updatedSupplier = await storage.updateSupplier(id, validatedData);
      
      if (!updatedSupplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.json(updatedSupplier);
    } catch (error) {
      res.status(400).json({ message: "Invalid supplier data" });
    }
  });
  
  app.delete("/api/suppliers/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteSupplier(id);
      
      if (!result) {
        return res.status(404).json({ message: "Supplier not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete supplier" });
    }
  });
  
  // Agreements
  app.get("/api/agreements", isAuthenticated, async (req, res) => {
    try {
      let agreements;
      
      if (req.query.supplierId) {
        agreements = await storage.getAgreementsBySupplier(parseInt(req.query.supplierId as string));
      } else {
        agreements = await storage.getAgreements();
      }
      
      res.json(agreements || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agreements" });
    }
  });
  
  app.get("/api/agreements/:id", isAuthenticated, async (req, res) => {
    try {
      const agreement = await storage.getAgreement(parseInt(req.params.id));
      if (!agreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      res.json(agreement);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch agreement" });
    }
  });
  
  app.post("/api/agreements", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertAgreementSchema.parse(req.body);
      const newAgreement = await storage.createAgreement(validatedData);
      res.status(201).json(newAgreement);
    } catch (error) {
      res.status(400).json({ message: "Invalid agreement data" });
    }
  });
  
  app.put("/api/agreements/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertAgreementSchema.partial().parse(req.body);
      const updatedAgreement = await storage.updateAgreement(id, validatedData);
      
      if (!updatedAgreement) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      
      res.json(updatedAgreement);
    } catch (error) {
      res.status(400).json({ message: "Invalid agreement data" });
    }
  });
  
  app.delete("/api/agreements/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const result = await storage.deleteAgreement(id);
      
      if (!result) {
        return res.status(404).json({ message: "Agreement not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete agreement" });
    }
  });
  
  // Price Lists
  app.get("/api/agreements/:id/pricelist", isAuthenticated, async (req, res) => {
    try {
      const agreementId = parseInt(req.params.id);
      const priceList = await storage.getPriceLists(agreementId);
      res.json(priceList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch price list" });
    }
  });
  
  app.post("/api/agreements/:id/pricelist", isAuthenticated, async (req, res) => {
    try {
      const agreementId = parseInt(req.params.id);
      
      // Check if this is a bulk import or single item
      if (Array.isArray(req.body)) {
        const validatedItems = req.body.map(item => ({
          ...insertPriceListSchema.parse(item),
          agreementId
        }));
        
        const priceList = await storage.createPriceLists(validatedItems);
        res.status(201).json(priceList);
      } else {
        const validatedData = insertPriceListSchema.parse({
          ...req.body,
          agreementId
        });
        
        const priceListItem = await storage.createPriceList(validatedData);
        res.status(201).json(priceListItem);
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid price list data" });
    }
  });
  
  // Projects
  app.get("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const projects = await storage.getProjects();
      console.log("Fetched projects:", projects);
      res.json(projects || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });
  
  app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
    try {
      const project = await storage.getProject(parseInt(req.params.id));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });
  
  app.post("/api/projects", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const newProject = await storage.createProject(validatedData);
      res.status(201).json(newProject);
    } catch (error) {
      res.status(400).json({ message: "Invalid project data" });
    }
  });
  
  // Service Tickets
  app.get("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const tickets = await storage.getServiceTickets();
      console.log("Fetched service tickets:", tickets);
      res.json(tickets || []);
    } catch (error) {
      console.error("Error fetching service tickets:", error);
      res.status(500).json({ message: "Failed to fetch service tickets" });
    }
  });
  
  app.get("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ticket = await storage.getServiceTicket(id);
      
      if (!ticket) {
        return res.status(404).json({ message: "Service ticket not found" });
      }
      
      // Get ticket items
      const items = await storage.getServiceTicketItems(id);
      
      res.json({ ...ticket, items });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch service ticket" });
    }
  });
  
  app.post("/api/tickets", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertServiceTicketSchema.parse({
        ...req.body,
        createdBy: req.user?.id,
      });
      
      const newTicket = await storage.createServiceTicket(validatedData);
      res.status(201).json(newTicket);
    } catch (error) {
      res.status(400).json({ message: "Invalid service ticket data" });
    }
  });
  
  app.put("/api/tickets/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceTicketSchema.partial().parse(req.body);
      
      // If approving, add approver information
      if (validatedData.status === "approved" && req.user) {
        validatedData.approvedBy = req.user.id;
        validatedData.dateApproved = new Date();
      }
      
      // If submitting, update submit date
      if (validatedData.status === "submitted") {
        validatedData.dateSubmitted = new Date();
      }
      
      const updatedTicket = await storage.updateServiceTicket(id, validatedData);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Service ticket not found" });
      }
      
      res.json(updatedTicket);
    } catch (error) {
      res.status(400).json({ message: "Invalid service ticket data" });
    }
  });
  
  app.post("/api/tickets/:id/items", isAuthenticated, async (req, res) => {
    try {
      const ticketId = parseInt(req.params.id);
      
      // Ensure the ticket exists
      const ticket = await storage.getServiceTicket(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Service ticket not found" });
      }
      
      const validatedData = insertTicketItemSchema.parse({
        ...req.body,
        ticketId
      });
      
      const newItem = await storage.createTicketItem(validatedData);
      res.status(201).json(newItem);
    } catch (error) {
      res.status(400).json({ message: "Invalid ticket item data" });
    }
  });
  
  // Claims
  app.get("/api/claims", isAuthenticated, async (req, res) => {
    try {
      const claims = await storage.getClaims();
      console.log("Fetched claims:", claims);
      res.json(claims || []);
    } catch (error) {
      console.error("Error fetching claims:", error);
      res.status(500).json({ message: "Failed to fetch claims" });
    }
  });
  
  app.get("/api/claims/:id", isAuthenticated, async (req, res) => {
    try {
      const claim = await storage.getClaim(parseInt(req.params.id));
      if (!claim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      // Get associated files
      const files = await storage.getFileUploads("claim", claim.id);
      
      res.json({ ...claim, files });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch claim" });
    }
  });
  
  app.post("/api/claims", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClaimSchema.parse({
        ...req.body,
        createdBy: req.user?.id,
      });
      
      const newClaim = await storage.createClaim(validatedData);
      res.status(201).json(newClaim);
    } catch (error) {
      res.status(400).json({ message: "Invalid claim data" });
    }
  });
  
  app.put("/api/claims/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClaimSchema.partial().parse(req.body);
      
      const updatedClaim = await storage.updateClaim(id, validatedData);
      
      if (!updatedClaim) {
        return res.status(404).json({ message: "Claim not found" });
      }
      
      res.json(updatedClaim);
    } catch (error) {
      res.status(400).json({ message: "Invalid claim data" });
    }
  });
  
  // File uploads
  app.post("/api/uploads", isAuthenticated, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const { entityType, entityId, isVisibleToSupplier } = req.body;
      
      if (!entityType || !entityId) {
        return res.status(400).json({ message: "Missing entity information" });
      }
      
      const fileData = insertFileUploadSchema.parse({
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        entityType,
        entityId: parseInt(entityId),
        isVisibleToSupplier: isVisibleToSupplier === 'true',
        uploadedBy: req.user?.id
      });
      
      const savedFile = await storage.createFileUpload(fileData);
      res.status(201).json(savedFile);
    } catch (error) {
      res.status(400).json({ message: "Invalid file data" });
    }
  });
  
  // Serve uploaded files
  app.get("/api/uploads/:filename", isAuthenticated, (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    res.sendFile(filePath);
  });
  
  // Dashboard Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Get active suppliers (all suppliers for now)
      const suppliers = await storage.getSuppliers();
      
      // Get active agreements
      const agreements = await storage.getAgreements();
      
      // Get open claims
      const claims = await storage.getClaims();
      const openClaims = claims.filter(claim => 
        claim.statusText === 'New' || 
        claim.statusText === 'In negotiation' || 
        claim.statusText === 'Under investigation'
      );
      
      // Get recent tickets
      const serviceTickets = await storage.getServiceTickets();
      const recentTickets = serviceTickets.length;
      
      // Get tickets pending approval
      const pendingApproval = serviceTickets.filter(ticket => 
        ticket.status === 'Submitted' || 
        ticket.status === 'Pending'
      ).length;
      
      // Get claims analytics
      const claimsAnalytics = {
        total: claims.length,
        totalValue: claims.reduce((sum, claim) => {
          const amount = parseFloat(claim.damageAmount || '0');
          return sum + (isNaN(amount) ? 0 : amount);
        }, 0),
        byType: {
          material: {
            count: claims.filter(claim => claim.claimArea === 'Material').length,
            value: claims.filter(claim => claim.claimArea === 'Material')
              .reduce((sum, claim) => {
                const amount = parseFloat(claim.damageAmount || '0');
                return sum + (isNaN(amount) ? 0 : amount);
              }, 0)
          },
          service: {
            count: claims.filter(claim => claim.claimArea === 'Service').length,
            value: claims.filter(claim => claim.claimArea === 'Service')
              .reduce((sum, claim) => {
                const amount = parseFloat(claim.damageAmount || '0');
                return sum + (isNaN(amount) ? 0 : amount);
              }, 0)
          },
          hse: {
            count: claims.filter(claim => claim.claimArea === 'HSE').length,
            value: claims.filter(claim => claim.claimArea === 'HSE')
              .reduce((sum, claim) => {
                const amount = parseFloat(claim.damageAmount || '0');
                return sum + (isNaN(amount) ? 0 : amount);
              }, 0)
          }
        }
      };
      
      // Get top suppliers by rating
      const ratings = await storage.getSupplierRatings();
      const supplierRatings = new Map();
      
      for (const rating of ratings) {
        if (!supplierRatings.has(rating.supplierId)) {
          const supplier = suppliers.find(s => s.id === rating.supplierId);
          supplierRatings.set(rating.supplierId, {
            id: rating.supplierId,
            name: supplier ? supplier.companyName : `Supplier ${rating.supplierId}`,
            ratings: [],
            avgRating: 0
          });
        }
        
        supplierRatings.get(rating.supplierId).ratings.push(parseFloat(rating.overallRating));
      }
      
      // Calculate average rating for each supplier
      const topSuppliers = Array.from(supplierRatings.values()).map(item => {
        const avg = item.ratings.reduce((sum, rating) => sum + rating, 0) / item.ratings.length;
        return {
          ...item,
          avgRating: isNaN(avg) ? 0 : parseFloat(avg.toFixed(1))
        };
      }).sort((a, b) => b.avgRating - a.avgRating).slice(0, 5);
      
      res.json({
        metrics: {
          activeSuppliers: suppliers.length,
          activeAgreements: agreements.length,
          openClaims: openClaims.length,
          recentTickets,
          pendingApproval
        },
        claimsAnalytics,
        topSuppliers
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  // Supplier Ratings
  app.get("/api/ratings", isAuthenticated, async (req, res) => {
    try {
      let ratings;
      
      if (req.query.supplierId) {
        ratings = await storage.getSupplierRatingsBySupplier(parseInt(req.query.supplierId as string));
      } else {
        ratings = await storage.getSupplierRatings();
      }
      
      console.log("Fetched supplier ratings:", ratings);
      res.json(ratings || []);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ratings" });
    }
  });
  
  app.post("/api/ratings", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSupplierRatingSchema.parse({
        ...req.body,
        createdBy: req.user?.id,
      });
      
      const newRating = await storage.createSupplierRating(validatedData);
      res.status(201).json(newRating);
    } catch (error) {
      res.status(400).json({ message: "Invalid rating data" });
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}
