import React, { useState, useEffect } from "react";
import { ArrowBackIcon } from "@chakra-ui/icons";

// import { ArrowBackIcon } from "@chakra-ui/icons";
// import {
//   Box,
//   FormControl,
//   IconButton,
//   Input,
//   Spinner,
//   Text,
//   useToast,
// } from "@chakra-ui/react";
import { ChatState } from "../context/ChatProvider";
import Lottie from "react-lottie";

import {
  Box,
  Text,
  Heading,
  Divider,
  FormControl,
  Input,
  useToast,
  IconButton,
  Spinner,
} from "@chakra-ui/react";
import { IoIosArrowBack } from "react-icons/io";
import { getSender, getSenderFull } from "../config/ChatLogics";
import ProfileModel from "./ProfileModel";
import UpdateGroupChatModal from "./UpdateGroupChatModal";
import Loader from "./Loader";
import { toast } from "react-toastify";
import axios from "axios";
import ScrollableChat from "./ScrollableChat";
import animationData from "../animations/typing.json";
// for socket.io
import io from "socket.io-client";
const ENDPOINT = "https://talkative.herokuapp.com/";
var socket, selectedChatCompare;

const SingleChat = ({ fetchAgain, setFetchAgain }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState();
  const [loading, setLoading] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [typing, setTyping] = useState();
  const [isTyping, setIsTyping] = useState();
  const toast = useToast();

   const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: animationData,
    rendererSettings: {
      preserveAspectRatio: "xMidYMid slice",
    },
  };

  const { user, selectedChat, setSelectedChat, notification, setNotification } =
    ChatState();

    const typingHandler = (e) => {
    setNewMessage(e.target.value);

    if (!socketConnected) return;

    if (!typing) {
      setTyping(true);
      socket.emit("typing", selectedChat._id);
    }
    let lastTypingTime = new Date().getTime();
    var timerLength = 3000;
    setTimeout(() => {
      var timeNow = new Date().getTime();
      var timeDiff = timeNow - lastTypingTime;
      if (timeDiff >= timerLength && typing) {
        socket.emit("stop typing", selectedChat._id);
        setTyping(false);
      }
    }, timerLength);
  };
  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
    // eslint-disable-next-line
  }, []);

  const fetchAllMessages = async () => {
    if (!selectedChat) return;
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      setLoading(true);
      const { data } = await axios.get(
        `/api/message/${selectedChat._id}`,
        config
      );
      setMessages(data);
      setLoading(false);
      socket.emit("join chat", selectedChat._id);
    } catch (err) {
      toast.error(err);
      setLoading(false);
      return;
    }
  };

  useEffect(() => {
    fetchAllMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);


  const sendMessage = async (e) => {
    if (e.key === "Enter" && newMessage) {
      socket.emit("stop typing", selectedChat._id);
      try {
        const config = {
          headers: {
            "Content-type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
        };
        setNewMessage("");
        const { data } = await axios.post(
          "/api/message",
          {
            chatId: selectedChat._id,
            content: newMessage,
          },
          config
        );
        socket.emit("new message", data);
        setMessages([...messages, data]);
      } catch (err) {
        toast.error(err);
        return;
      }
    }
  };

  const saveNotification = async () => {
    if (!notification.length) return;
    try {
      const config = {
        headers: {
          "Content-type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.post(
        "/api/notification",
        {
          notification: notification[0].chatId.latestMessage,
        },
        config
      );
    } catch (err) {
      toast.error(err);
    }
  };

  useEffect(() => {
    socket = io(ENDPOINT);
    socket.emit("setup", user.user);
    socket.on("connected", () => setSocketConnected(true));
    socket.on("typing", () => setIsTyping(true));
    socket.on("stop typing", () => setIsTyping(false));
  }, []);

  

  console.log(notification);
  useEffect(() => {
    socket.on("message received", (newMessageReceived) => {
      if (
        !selectedChatCompare ||
        selectedChatCompare._id !== newMessageReceived.chatId._id
      ) {
        if (!notification.includes()) {
          setNotification([newMessageReceived, ...notification]);
          setFetchAgain(!fetchAgain);
        }
      } else {
        setMessages([...messages, newMessageReceived]);
      }
    });
  });
  useEffect(() => {
    saveNotification();
  }, [notification]);
  
  return (
    <>
    
      {selectedChat ? (
        <>
          <Box
            py="3.0"
            px="4"
            w="100%"
            d="flex"
            justifyContent={{ base: "space-between" }}
            alignItems="center"
            bg="#fff"
            borderRadius="lg"
          >
            {/* <Box
              d={{ base: "flex", md: "none" }}
              mr="5"
              onClick={() => setSelectedChat("")}
            > */}
              {/* <IoIosArrowBack /> */}
              <IconButton
              display={{ base: "flex", md: "none" }}
              icon={<IoIosArrowBack />}
              onClick={() => setSelectedChat("")}
            />
            {/* </Box> */}
            {!selectedChat.isGroupChat ? (
                <>
                   {getSender(user.user, selectedChat.users).name}
                  <ProfileModel
                    user={getSenderFull(user.user, selectedChat.users)}
                  />
                </>
              )  
              //
              : (
              <>
                {selectedChat.chatName.toUpperCase()}
                <UpdateGroupChatModal
                  fetchAgain={fetchAgain}
                  setFetchAgain={setFetchAgain}
                  fetchAllMessages={fetchAllMessages}
                />
              </>
            )}
          </Box>
          <Box
            d="flex"
            flexDir="column"
            p="3"
            w="100%"
            h={{ base: "73vh", md: "100%" }}
            overflowY="hidden"
          >
            {loading ? (
              <Loader />
            ) : (
              <div className="message">
                {<ScrollableChat messages={messages} />}
              </div>
            )}
          <FormControl
            onKeyDown={sendMessage}
            isRequired
            mt={3}
            // border="1px solid #fff"
            // borderRadius="8px"
          >
            {isTyping ? (
                <div>
                  <Lottie
                    options={defaultOptions}
                    width={70}
                    style={{ marginBottom: 15, marginLeft: 0 }}
                  />
                </div>
              ) : (
                <></>
              )}
            <Input
              variant="outline"
              bg="#1d1931"
              // h="2rem"
              color="#fff"
              margin = "1"
              // variant="filled"
              //   bg="#E0E0E0"
              placeholder="Enter a message..."
              onChange={typingHandler}
              value={newMessage}
            />
          </FormControl>
          </Box>
        </>
      ) : (
        <Box
          d="flex"
          alignItems="center"
          justifyContent="center"
          h="100%"
          flexDir="column"
          color="rgba(255, 255, 255, 0.685)"
        >
          <Heading size="4xl" mb="4">
            Talk-A-Tive
          </Heading>
          <Divider />
          <Text fontSize="3xl" px="3">
            Select on a user to start chat
          </Text>
        </Box>
      )}
    </>
  );
   
};

export default SingleChat;