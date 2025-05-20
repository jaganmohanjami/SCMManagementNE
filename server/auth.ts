import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, insertUserSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "neptune-scm-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Set up passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register route
  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate request body
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create new user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Log in the new user
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      res.status(400).json({ message: "Invalid user data" });
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user route
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });

  // Initialize with default users if none exist
  initDefaultUsers();
}

async function initDefaultUsers() {
  const adminUser = await storage.getUserByUsername("admin");
  if (!adminUser) {
    await storage.createUser({
      username: "admin",
      password: await hashPassword("admin123"),
      name: "System Administrator",
      email: "admin@neptune.com",
      role: "purchasing",
      companyId: undefined
    });
  }
  
  const operationsUser = await storage.getUserByUsername("operations");
  if (!operationsUser) {
    await storage.createUser({
      username: "operations",
      password: await hashPassword("operations123"),
      name: "Operations Manager",
      email: "operations@neptune.com",
      role: "operations",
      companyId: undefined
    });
  }
  
  const accountingUser = await storage.getUserByUsername("accounting");
  if (!accountingUser) {
    await storage.createUser({
      username: "accounting",
      password: await hashPassword("accounting123"),
      name: "Accounting Manager",
      email: "accounting@neptune.com",
      role: "accounting",
      companyId: undefined
    });
  }
  
  const legalUser = await storage.getUserByUsername("legal");
  if (!legalUser) {
    await storage.createUser({
      username: "legal",
      password: await hashPassword("legal123"),
      name: "Legal Manager",
      email: "legal@neptune.com",
      role: "legal",
      companyId: undefined
    });
  }
  
  const managementUser = await storage.getUserByUsername("management");
  if (!managementUser) {
    await storage.createUser({
      username: "management",
      password: await hashPassword("management123"),
      name: "Management Executive",
      email: "management@neptune.com",
      role: "management",
      companyId: undefined
    });
  }
  
  const supplierUser = await storage.getUserByUsername("supplier");
  if (!supplierUser) {
    await storage.createUser({
      username: "supplier",
      password: await hashPassword("supplier123"),
      name: "Supplier Representative",
      email: "supplier@example.com",
      role: "supplier",
      companyId: undefined
    });
  }
}
