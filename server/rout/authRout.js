import express from "express"
import { Logout,Login, SignUp} from "../routController/authController.js";
import isLogin from "../middleware/isLogin.js";
const router = express.Router();

router.post('/Login',Login)

router.post('/signup',SignUp)
router.post('/Logout',isLogin,Logout)
export default router