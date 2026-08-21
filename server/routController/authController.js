import User from "../schema/userSchema.js";
import bcrypt from 'bcryptjs'
import jwtToken from "../utils/jwtToken.js";
export const SignUp=async(req,res)=>{
    try{
        const { fullname, username, email, password, gender, profilepic } = req.body;
        const user= await User.findOne({ username });
        if(user) return res.status(500).send({success:false, message:"User already Exixt with this UserName"});
        const emailpresent = await  User.findOne({ email});
        if(emailpresent) return res.status(500).send({success:false, message:"User already Exixt with this UserName"});
        const hashPassword = bcrypt.hashSync(password,10);
        const boyppf = profilepic || `https://avatar.iran.liara.run/public/boy?username=${username}`
        const girlppf= profilepic || `https://avatar.iran.liara.run/public/girl?username=${username}`;

        const newUser = new User({
            fullName:fullname,
            username,
            email,
            password:hashPassword,
            gender,
            profilepic:gender === "male" ? boyppf : girlppf
        })
        if(newUser){
            await newUser.save();
        }
        else{
            res.status(500).send({success:false, message:"Invalid User Data"});
        }
        res.status(201).send({
            message: " Signup Successfull!!"
        })
    }
    catch(error){
        res.status(500).send({
            success:false,
            message:error
        });
        console.log(error);
    }
}

export const Login=async (req,res) =>{
    try{
        const { email, password } = req.body;
        const user= await User.findOne({ email});
        if(!user) return res.status(500).send({success:false, message:"Email doesn't Exist"});
        const comparePassword = bcrypt.compareSync(password,user.password || '');
        if(!comparePassword) return res.status(500).send({success:false, message:"Email or Password doesn't Matching"});
        const token = jwtToken(user._id,res);
        //console.log(token);
        res.status(200).send({
           _id:user._id,
           fullName:user.fullName,
           username:user.username,
           profilepic:user.profilepic,
           email:user.email,
           message:"Successfully LogIn",
           token
        })
    }
    catch(error){
        res.status(500).send({
            success:false,
            message:error
        });
        console.log(error);
    }
}

export const Logout=async(req,res) => {
    try{
        res.clearCookie('jwt',{
            path:'/',
            httpOnly:true,
            secure:true,
        })
        res.status(200).send({messages:"User Logout"})
    }catch (error){
        res.status(500).send({
            success:false,
            message:error.message
        });
        console.log(error);
    }

}