import { Request, Response } from "express";
import { Express } from "express";
import { storage } from "./storage";
import { insertSupplierRatingSchema } from "@shared/schema";
import { sendRatingRequestEmail, sendRatingCompletedEmail, sendRatingAcceptedEmail } from "./email-service";

export function setupRatingRoutes(app: Express) {
  // Get all ratings
  app.get("/api/ratings", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const ratings = await storage.getSupplierRatings();
      res.json(ratings);
    } catch (error) {
      console.error("Error fetching ratings:", error);
      res.status(500).json({ message: "Error fetching ratings" });
    }
  });

  // Get a specific rating
  app.get("/api/ratings/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const rating = await storage.getSupplierRating(id);
      
      if (!rating) {
        return res.status(404).json({ message: "Rating not found" });
      }
      
      res.json(rating);
    } catch (error) {
      console.error("Error fetching rating:", error);
      res.status(500).json({ message: "Error fetching rating" });
    }
  });

  // Create a rating request
  app.post("/api/ratings/requests", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Ensure the user is a supplier
      if (req.user.role !== "supplier") {
        return res.status(403).json({ message: "Only suppliers can request ratings" });
      }
      
      const { supplierId, projectId, requestDescription } = req.body;
      
      // Validate inputs
      if (!supplierId || !projectId || !requestDescription) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Create a new rating request with pending status
      const ratingRequest = await storage.createSupplierRatingRequest({
        supplierId,
        projectId,
        requestDate: new Date(),
        requestDescription,
        status: "pending",
        createdBy: req.user.id
      });
      
      // Get supplier and project details for the email
      const supplier = await storage.getSupplier(supplierId);
      const project = await storage.getProject(projectId);
      
      if (supplier && supplier.email) {
        // Send email notification to the supplier
        await sendRatingRequestEmail(
          supplier.email,
          supplier.companyName,
          project?.projectName || `Project #${projectId}`
        );
      }
      
      // Create an activity log
      await storage.createActivityLog({
        action: "RATING_REQUESTED",
        entityType: "supplier_rating",
        entityId: ratingRequest.id,
        userId: req.user.id,
        details: `${supplier?.companyName || "Supplier"} requested a rating for ${project?.projectName || "a project"}`
      });
      
      res.status(201).json(ratingRequest);
    } catch (error) {
      console.error("Error creating rating request:", error);
      res.status(500).json({ message: "Error creating rating request" });
    }
  });

  // Submit a rating (for engineers)
  app.post("/api/ratings", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      // Ensure the user is an engineer or has appropriate role
      if (!["engineer", "operations", "management"].includes(req.user.role)) {
        return res.status(403).json({ message: "Not authorized to submit ratings" });
      }
      
      // Parse and validate the rating data
      const validatedData = insertSupplierRatingSchema.parse(req.body);
      
      const rating = await storage.createSupplierRating({
        ...validatedData,
        ratingDate: new Date(),
        createdBy: req.user.id,
        status: "completed" // Rating is completed but not yet accepted by supplier
      });
      
      // Get supplier and project details for the email
      const supplier = await storage.getSupplier(rating.supplierId);
      const project = await storage.getProject(rating.projectId);
      
      if (supplier && supplier.email) {
        // Send email notification to the supplier that rating is complete
        await sendRatingCompletedEmail(
          supplier.email,
          supplier.companyName,
          project?.projectName || `Project #${rating.projectId}`,
          Number(rating.overallRating)
        );
      }
      
      // Create an activity log
      await storage.createActivityLog({
        action: "RATING_COMPLETED",
        entityType: "supplier_rating",
        entityId: rating.id,
        userId: req.user.id,
        details: `Rating completed for ${supplier?.companyName || "Supplier"} with score: ${rating.overallRating}/5`
      });
      
      res.status(201).json(rating);
    } catch (error) {
      console.error("Error creating rating:", error);
      res.status(500).json({ message: "Error creating rating" });
    }
  });

  // Accept a rating (for suppliers)
  app.patch("/api/ratings/:id/accept", async (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const rating = await storage.getSupplierRating(id);
      
      if (!rating) {
        return res.status(404).json({ message: "Rating not found" });
      }
      
      // Ensure the user is the supplier who owns this rating
      if (req.user.role !== "supplier" || req.user.companyId !== rating.supplierId) {
        return res.status(403).json({ message: "Not authorized to accept this rating" });
      }
      
      // Update the rating status to accepted
      const updatedRating = await storage.updateSupplierRating(id, {
        status: "accepted",
        acceptedDate: new Date()
      });
      
      // Get supplier, project, and engineer details for the email
      const supplier = await storage.getSupplier(rating.supplierId);
      const project = await storage.getProject(rating.projectId);
      const engineer = await storage.getUser(rating.createdBy);
      
      if (engineer?.email) {
        // Send email notification to the engineer that the rating was accepted
        await sendRatingAcceptedEmail(
          engineer.email,
          supplier?.companyName || "Supplier",
          project?.projectName || `Project #${rating.projectId}`,
          Number(rating.overallRating)
        );
      }
      
      // Create an activity log
      await storage.createActivityLog({
        action: "RATING_ACCEPTED",
        entityType: "supplier_rating",
        entityId: rating.id,
        userId: req.user.id,
        details: `${supplier?.companyName || "Supplier"} accepted their performance rating of ${rating.overallRating}/5`
      });
      
      res.json(updatedRating);
    } catch (error) {
      console.error("Error accepting rating:", error);
      res.status(500).json({ message: "Error accepting rating" });
    }
  });
}