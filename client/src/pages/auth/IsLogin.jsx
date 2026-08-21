import react from "react";
import { useUser } from "../../context/UserContextApi";
import { Navigate, Outlet } from "react-router-dom";
function IsLogin() {
    const {user,loading} = useUser();
    console.log("IsLogin user:", user);
    if(loading){
        return <div>Loading...</div>
    }
    return (
        user ? <Outlet/> : <Navigate to="/login"/>
    );
}

export default IsLogin;