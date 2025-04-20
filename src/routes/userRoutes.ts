import { Router, Request, Response, NextFunction } from "express";
import { registerUser, loginUser, logoutUser, getUserProfile } from "../controllers/userController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = Router();

router.post("/user/register", async (req, res, next) => {
    try {
      await registerUser(req, res);
    } catch (error) {
      next(error);
    }
});

router.post("/user/login", async (req, res, next) => {
    try {
        await loginUser(req, res);
        } catch (error) {
        next(error);
    }
});

router.post("/user/logout", authenticateToken, logoutUser);

router.get('/user', authenticateToken, getUserProfile);


export default router;