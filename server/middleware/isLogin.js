import jwt from "jsonwebtoken";
import User from "../schema/userSchema.js";

const isLogin = async (req, res, next) => {

    try {

        const token = req.cookies.jwt;

        if (!token) {
            return res.status(401).send({
                success: false,
                message: "user unauthorized"
            });
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        if (!decode) {
            return res.status(401).send({
                success: false,
                message: "user unauthorized - Invalid token"
            });
        }

        const user = await User.findById(decode.userId).select("-password");

        if (!user) {
            return res.status(401).send({
                success: false,
                message: "user not found"
            });
        }

        req.user = user;

        next();

    } catch (error) {

        res.status(500).send({
            success: false,
            message: error.message
        });

        console.log("isLogin middleware error :", error);
    }
};

export default isLogin;