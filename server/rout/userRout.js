import express from "express"
import { getAllUsers } from "../routController/userController.js";
import isLogin from "../middleware/isLogin.js";
const router = express.Router();

router.get('/',isLogin,getAllUsers)



export default router;