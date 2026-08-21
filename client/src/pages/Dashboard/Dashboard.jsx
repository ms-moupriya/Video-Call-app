import { useState, useEffect, useRef } from "react";
import { useUser } from "../../context/UserContextApi";
import { data, useNavigate } from "react-router-dom";
import { FaBars, FaTimes, FaPhoneAlt, FaMicrophone, FaVideo, FaVideoSlash, FaMicrophoneSlash,FaDoorClosed } from "react-icons/fa";
import { FaPhoneSlash } from "react-icons/fa6";
import apiClient from "../../apiClient";
import SocketContext from "../socket/SocketContext";
import Peer from 'simple-peer';

function Dashboard() {
  const { user, updateUser } = useUser();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [showReceiverDetailPopUp, setShowReceiverDetailPopUp] = useState(false);
  const [showReceiverDetails, setShowReceiverDetails] = useState(null);

  const hasJoined = useRef(false);
  const myVideo = useRef();
  const reciverVideo = useRef();

  const [stream, setStream] = useState();
  const [me, setMe] = useState("");
  const connectionRef = useRef(); //current user peer reference
  const [onlineUsers, setOnlineUser] = useState([]);

  const [reciveingCall, setReceiveingCall] = useState(false);
  const [caller, setCaller] = useState(null);
  const [callerSignal, setCallerSignal] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  const [callRejectedPopUp, setCallRejectedPopUp] = useState(false);
  const [callRejectedUser, setCallRejectedUser] = useState(null);

  // 🔹 State to track microphone & video status
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);

  const socket = SocketContext.getSocket();
  console.log(socket);

  const getProfileImage = (profileUser) => {
    if (!profileUser) {
      return "https://api.dicebear.com/7.x/adventurer/svg?seed=user";
    }

    const { profilepic, username, name } = profileUser;
    const displayName = username || name || "user";
    // No profile picture
    if (!profilepic) {
      return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
        displayName
      )}`;
    }

    // Already a complete URL
    if (
      profilepic.startsWith("http://") ||
      profilepic.startsWith("https://")
    ) {
      return profilepic;
    }

    const cleanPath = profilepic.replace(/^\/+/, "");

    return `http://localhost:5000/${cleanPath}`;
  };

  useEffect(() => {

    if (user && socket && !hasJoined.current) {
      socket.emit("join", { id: user._id, name: user.username });
      hasJoined.current = true;
    }

    socket.on("me", (id) => setMe(id));

    socket.on("online-users", (onlineUser) => {
      setOnlineUser(onlineUser)
    })

    socket.on("callToUser", (data) => {
      setReceiveingCall(true);
      setCaller(data);
      setCallerSignal(data.signal);
    })
    socket.on("callEnded",(data)=>{
      console.log("call ended by",data.name);
      endCallCleanup();
    })

    socket.on("callRejected", (data) => {
      setCallRejectedPopUp(true);
      setCallRejectedUser(data);
    })


    return () => {
      socket.off("me");
      socket.off("online-users");
      socket.off("callToUser");
      socket.off("callEnded");
      socket.off("callRejected");
    }
  }, [user, socket])
  console.log("getting call from", caller);

  const allusers = async () => {
    try {
      setLoading(true);

      const response = await apiClient.get("/user");

      if (response.data.success !== false) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    allusers();
  }, []);

  const isOnlineUser = (userId) => {
    return onlineUsers.some((u) => u.userId === userId);
  };
  const startCall = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })

      currentStream.getAudioTracks().forEach(track => (track.enabled = true));


      setStream(currentStream)
      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
        myVideo.current.muted = true;
        myVideo.current.volume = 0;
      }
      currentStream.getAudioTracks().forEach(track => (track.enabled = true));
      setIsSidebarOpen(false);
      setCallRejectedPopUp(false);
      setSelectedUser(showReceiverDetails._id);
      //console.log("calling to", showReceiverDetails._id);

      const peer = new Peer({
        initiator: true,
        trickle: false,
        stream: currentStream,
      })
      // Handle the "signal" event (this occurs when the webRTC handshake is initiated)
      peer.on("signal", (data) => {
        console.log("call to userwith signal")
        socket.emit("callToUser", {
          callToUserId: showReceiverDetails._id,
          signalData: data,
          from: me,
          name: user.username,
          email: user.email,
          profilepic: user.profilepic
        })
      })
      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;
          reciverVideo.current.muted = false;
          reciverVideo.current.volume = 1.0;
        }
      })

      socket.once("callAccepted", (data) => {
        setCallRejectedPopUp(false);
        setCallAccepted(true);
        setCaller(data.from);
        peer.signal(data.signal);
      })
      connectionRef.current = peer
      setShowReceiverDetailPopUp(false);

    } catch (error) {
      console.log("error accessing media device :", error);
    }
  }
  const handelacceptCall = async () => {
    try {
      const currentStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      setStream(currentStream);

      if (myVideo.current) {
        myVideo.current.srcObject = currentStream;
      }
      currentStream.getAudioTracks().forEach(track => (track.enabled = true));
      setCallAccepted(true);
      setReceiveingCall(true);
      setIsSidebarOpen(false);

      const peer = new Peer({
        initiator: false,
        trickle: false,
        stream: currentStream,
      })

      peer.on("signal", (data => {
        socket.emit("answeredCall", {
          signal: data,
          from: me,
          to: caller.from
        })
      }))
      peer.on("stream", (remoteStream) => {
        if (reciverVideo.current) {
          reciverVideo.current.srcObject = remoteStream;
          reciverVideo.current.muted = false;
          reciverVideo.current.volume = 1.0;
        }
      })

      if (callerSignal) peer.signal(callerSignal);
      connectionRef.current = peer
    } catch (error) {
      console.log("error in sending media device :", error);
    }
  }
  const handelendCall=()=>{
    const targetSocketId = caller?.from || selectedUser;
    if (targetSocketId){
    socket.emit("call-ended",{
      to:caller.from || selectedUser,
      name:user.username
    });
  }
    endCallCleanup();
  }
  const handelrejectCall = () => {
    setReceiveingCall(false);
    setCallAccepted(false);

    socket.emit("reject-call", {
      to: caller.from,
      name: user.username,
      profilepic: user.profilepic
    })
  }
  
  // 🎤 Toggle Microphone
  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(videoTrack.enabled);
      }
    }
  };

  const endCallCleanup=()=>{
    if(stream){
      stream.getTracks().forEach((track)=>track.stop());
    }
      if(reciverVideo.current){
        reciverVideo.current.srcObject = null;
      }
      if(myVideo.current){
        myVideo.current.srcObject = null;
      }

      connectionRef.current?.destroy();

      setStream(null);
      setReceiveingCall(false);
      setCallAccepted(false);
      setSelectedUser(null);
      setTimeout(()=>{
        window.location.reload();
      },100)
    }
  

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");

      if (socket) {
        socket.disconnect();
      }

      SocketContext.setSocket();

      updateUser(null);
      localStorage.removeItem("userData");

      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const filteredUsers = users.filter((u) => {
    const username = u.username?.toLowerCase() || "";
    const email = u.email?.toLowerCase() || "";
    const search = searchQuery.toLowerCase();

    return username.includes(search) || email.includes(search);
  });

  const handelSelectedUser = (selectedUserData) => {
    console.log("Selected user:", selectedUserData);
    console.log("Selected profile picture:", selectedUserData.profilepic);

    setSelectedUser(selectedUserData._id);
    setShowReceiverDetails(selectedUserData);
    setShowReceiverDetailPopUp(true);
  };

  const closeReceiverPopup = () => {
    setShowReceiverDetailPopUp(false);
    setShowReceiverDetails(null);
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* ======================================================
          MOBILE OVERLAY
      ====================================================== */}

      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-10 md:hidden bg-black/30"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* ======================================================
          SIDEBAR
      ====================================================== */}

      <aside
        className={`
          bg-gradient-to-br from-blue-900 to-purple-800
          text-white
          w-64
          h-full
          p-4
          space-y-4
          fixed
          z-20
          transition-transform
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Sidebar Header */}

        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Users</h1>

          <button
            type="button"
            className="md:hidden text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <FaTimes />
          </button>
        </div>

        {/* Search */}

        <input
          type="text"
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="
            w-full
            px-3
            py-2
            rounded-md
            bg-gray-800
            text-white
            border
            border-gray-700
            mb-2
            outline-none
          "
        />

        {/* ==================================================
            USER LIST
        ================================================== */}

        <ul className="space-y-4 overflow-y-auto max-h-[calc(100vh-180px)]">
          {loading ? (
            <li className="text-center text-gray-300 py-4">
              Loading users...
            </li>
          ) : filteredUsers.length === 0 ? (
            <li className="text-center text-gray-300 py-4">
              No users found
            </li>
          ) : (
            filteredUsers.map((userData) => (
              <li
                key={userData._id}
                className={`
                  flex
                  items-center
                  gap-3
                  p-2
                  rounded-lg
                  cursor-pointer
                  transition
                  hover:scale-[1.02]
                  ${selectedUser === userData._id
                    ? "bg-green-600"
                    : "bg-gradient-to-r from-purple-600 to-blue-400"
                  }
                `}
                onClick={() => handelSelectedUser(userData)}
              >
                {/* Profile Image */}

                <div className="relative flex-shrink-0">
                  <img
                    src={getProfileImage(userData)}
                    alt={userData.username || "User"}
                    className="
                        w-10
                        h-10
                        rounded-full
                        object-cover
                        border-2
                        border-white
                        bg-gray-200
                      "
                    onError={(e) => {
                      e.currentTarget.onerror = null;

                      e.currentTarget.src =
                        `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                          userData.username || "user"
                        )}`;
                    }}
                  />

                  {/* Online indicator */}

                  {isOnlineUser(userData._id) && (
                    <span
                      className="
                        absolute
                        top-0
                        right-0
                        w-3
                        h-3
                        bg-green-500
                        border-2
                        border-gray-800
                        rounded-full
                        shadow-lg
                      "
                    ></span>
                  )}
                </div>

                {/* User Information */}

                <div className="flex flex-col min-w-0">
                  <span className="font-bold text-sm truncate">
                    {userData.username}
                  </span>

                  <span className="text-xs text-gray-200 truncate w-32">
                    {userData.email}
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>


        {user && (
          <div
            onClick={handleLogout}
            className="
              absolute
              bottom-2
              left-4
              right-4
              flex
              items-center
              gap-2
              bg-red-500
              hover:bg-red-600
              px-4
              py-2
              cursor-pointer
              rounded-lg
              transition
            "
          >
            <FaDoorClosed />
            Logout
          </div>
        )}
      </aside>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}




      {/* WELCOME*/}
      {selectedUser || reciveingCall || callAccepted ? (<div>
        <video ref={reciverVideo} autoPlay className="absolute top-0 left-0 w-full h-full object-contain rounded-lg" />
        <div className='absolute bottom-[75px] md:bottom-0 right-1 bg-gray-900 rounded-lg overflow-hidden'>
          <video ref={myVideo} autoPlay playsInline className="w-32 h-40 md:w-56 md:h-52 object-cover rounded-lg" />
        </div>
         {/* Username + Sidebar Button */}
          <div className="absolute top-4 left-4 text-white text-lg font-bold flex gap-2 items-center">
            <button
              type="button"
              className="md:hidden text-2xl text-white cursor-pointer"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars />
            </button>
            {caller?.username || "Caller"}
          </div>

          {/* Call Controls */}
          <div className="absolute bottom-4 w-full flex justify-center gap-4">
            <button
              type="button"
              className="bg-red-600 p-4 rounded-full text-white shadow-lg cursor-pointer"
              onClick={handelendCall}
            >
              <FaPhoneSlash size={24} />
            </button>
            {/* 🎤 Toggle Mic */}
            <button
              type="button"
              onClick={toggleMic}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isMicOn ? "bg-green-600" : "bg-red-600"
                }`}
            >
              {isMicOn ? <FaMicrophone size={24} /> : <FaMicrophoneSlash size={24} />}
            </button>

            {/* 📹 Toggle Video */}
            <button
              type="button"
              onClick={toggleCam}
              className={`p-4 rounded-full text-white shadow-lg cursor-pointer transition-colors ${isCamOn ? "bg-green-600" : "bg-red-600"
                }`}
            >
              {isCamOn ? <FaVideo size={24} /> : <FaVideoSlash size={24} />}
            </button>


          </div>
      </div>)
        : (
          <div className="flex-1 p-6 md:ml-72 text-white">{/* Mobile Sidebar Toggle */}
            <button
              type="button"
              className="md:hidden text-2xl text-black mb-4"
              onClick={() => setIsSidebarOpen(true)}
            >
              <FaBars />
            </button>
            <div className="flex items-center gap-5 mb-6 bg-gray-800 p-5 rounded-xl shadow-md">
              <div className="w-20 h-20 text-6xl">
                👋</div>

              <div>
                <h1
                  className="
                text-4xl
                font-extrabold
                bg-gradient-to-r
                from-blue-400
                to-purple-500
                text-transparent
                bg-clip-text
              "
                >
                  Hey {user?.username || "Guest"}! Welcome to Vidzy <span className="text-white">☺️</span>
                </h1>

                <p className="text-lg text-gray-300 mt-2">
                  Ready to <strong>connect with friends instantly?</strong>

                  Just <strong>select a user</strong> and start your video call!
                  🎥✨
                </p>
              </div>
            </div>

            {/* INSTRUCTIONS */}

            <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-sm">
              <h2 className="text-lg font-semibold mb-2">
                💡 How to Start a Video Call?
              </h2>

              <ul className="list-disc pl-5 space-y-2 text-gray-400">
                <li>📌 Open the sidebar to see online users.</li>
                <li>🔍 Use the search bar to find a specific person.</li>
                <li>🎥 Click on a user to view their details.</li>
                <li>📞 Click Call to start a video call.</li>
              </ul>
            </div>
          </div>
        )}

      {showReceiverDetailPopUp && showReceiverDetails && (
        <div
          className="
            fixed
            inset-0
            bg-black/30
            backdrop-blur-sm
            flex
            items-center
            justify-center
            z-50
            p-4
          "
        >
          <div
            className="
              bg-white
              rounded-xl
              shadow-2xl
              max-w-md
              w-full
              p-6
              relative
            "
          >
            {/* Close Button */}

            <button
              type="button"
              onClick={closeReceiverPopup}
              className="
                absolute
                top-3
                right-3
                text-gray-500
                hover:text-gray-800
                text-xl
              "
            >
              <FaTimes />
            </button>

            <div className="flex flex-col items-center">
              {/* Title */}

              <p className="font-black text-xl mb-4 text-gray-800">
                User Details
              </p>

              {/* ==================================================
                  IMPORTANT: PROFILE IMAGE
              ================================================== */}

              <img
                src={getProfileImage(showReceiverDetails)}
                alt={showReceiverDetails.username || "User"}
                className="
                  w-24
                  h-24
                  rounded-full
                  object-cover
                  border-4
                  border-blue-500
                  bg-gray-100
                  shadow-md
                "
                onError={(e) => {
                  /*
                   * If the actual profile picture cannot be loaded,
                   * show the DiceBear avatar instead.
                   */
                  e.currentTarget.onerror = null;

                  e.currentTarget.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                    showReceiverDetails.username || "user"
                  )}`;
                }}
              />

              {/* Username */}

              <h3 className="text-lg font-bold mt-3 text-gray-800">
                {showReceiverDetails.username}
              </h3>

              {/* Email */}

              <p className="text-sm text-gray-500">
                {showReceiverDetails.email}
              </p>

              {/* Online Status */}

              <div className="mt-2">
                {isOnlineUser(showReceiverDetails._id) ? (
                  <span className="text-green-600 text-sm font-semibold">
                    ● Online
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">
                    ● Offline
                  </span>
                )}
              </div>

              {/* ==================================================
                  BUTTONS
              ================================================== */}

              <div className="flex gap-4 mt-5">
                {/* Call */}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(showReceiverDetails._id);

                    startCall();

                    setShowReceiverDetailPopUp(false);
                  }}
                  className="
                    bg-green-600
                    hover:bg-green-700
                    text-white
                    px-4
                    py-2
                    rounded-lg
                    w-28
                    flex
                    items-center
                    gap-2
                    justify-center
                    transition
                  "
                >
                  Call
                  <FaPhoneAlt />
                </button>

                {/* Cancel */}

                <button
                  type="button"
                  onClick={closeReceiverPopup}
                  className="
                    bg-gray-400
                    hover:bg-gray-500
                    text-white
                    px-4
                    py-2
                    rounded-lg
                    w-28
                    transition
                  "
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {reciveingCall && !callAccepted && caller && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call From...</p>
              <img
                src={getProfileImage(caller)}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
                onError={(e) => {
                  e.currentTarget.onerror = null;

                  e.currentTarget.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                    caller?.name || "user"
                  )}`;
                }}
              />
              <h3 className="text-lg font-bold mt-3">{caller?.name}</h3>
              <p className="text-sm text-gray-500">{caller?.email}</p>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={handelacceptCall}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Accept <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={handelrejectCall}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Reject <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {callRejectedPopUp && (
        <div className="fixed inset-0 bg-transparent bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex flex-col items-center">
              <p className="font-black text-xl mb-2">Call Rejected From...</p>
              <img
                src={getProfileImage(callRejectedUser)}
                alt="Caller"
                className="w-20 h-20 rounded-full border-4 border-green-500"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(
                      callRejectedUser?.name || "user"
                    )}`;
                }}
              />
              <h3 className="text-lg font-bold mt-3">{callRejectedUser.name}</h3>
              <div className="flex gap-4 mt-5">
                <button
                  type="button"
                  onClick={() => {
                    startCall(); // function that handles media and calling
                  }}
                  className="bg-green-500 text-white px-4 py-1 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Call Again <FaPhoneAlt />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    //endCallCleanup();
                    setCallRejectedPopUp(false);
                    setShowReceiverDetailPopUp(false);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg w-28 flex gap-2 justify-center items-center"
                >
                  Back <FaPhoneSlash />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard