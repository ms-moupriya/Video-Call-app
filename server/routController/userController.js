import User from "../schema/userSchema.js";

export const getAllUsers = async (req, res) => {
    try {
        const currentUserID = req.user?._id;

        if (!currentUserID) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const users = await User.find(
            { _id: { $ne: currentUserID } },
            "profilepic username email"
        );

        res.status(200).json({
            success: true,
            users
        });

    } catch (error) {
        console.log(error);

        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};