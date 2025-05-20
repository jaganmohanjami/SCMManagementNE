import { Express, Request, Response } from "express";
import { storage } from "./storage";

export function setupDashboardStats(app: Express) {
  // Public dashboard stats endpoint
  app.get("/api/dashboard/stats", async (_req: Request, res: Response) => {
    try {
      // Get active suppliers
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
}