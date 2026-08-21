import mongoose from "mongoose";
import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const dbConnect = async () => {
    try {
        console.log("URI:", process.env.MONGOOSE_CONNECTION);

        await mongoose.connect(process.env.MONGOOSE_CONNECTION);

        console.log("Connected to Database");
    } catch (error) {
        console.error("MongoDB connection failed:");
        console.error(error);
    }
};

export default dbConnect;