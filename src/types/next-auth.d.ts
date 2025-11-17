import NextAuth from "next-auth"
import { User as AppUser } from "./user"

// Extend NextAuth types to include custom user properties
declare module "next-auth" {
  interface User extends AppUser {}
  
  interface Session {
    user: User;
  }
}