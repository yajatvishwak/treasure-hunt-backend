// Prework and Importing
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

require("dotenv").config();

const { default: humanId } = require("human-id");
const string = require("string-sanitizer");
const cors = require("cors");

const {
  uniqueNamesGenerator,
  adjectives,
  animals,
} = require("unique-names-generator");

const morgan = require("morgan");
const jwt = require("jsonwebtoken");
const { LocalStorage } = require("node-localstorage");
let localStorage = new LocalStorage("./localStorage");
localStorage.setItem("game-status", "active");

const Team = require("./models/Team");
const { default: mongoose } = require("mongoose");

const app = express();
app.use(morgan("dev"));
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000;

// server creation
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// State Declaration
let definedLevelQuestions = [
  `I'm sure this treasure hunt has got your spirits up high. Such a spirit talks to you now. To judge your soul and decide whether you live or die, all you've to do is guess who am I?`,
  `I’m a red hot American truck, but with a bipolar disorder.`,
  `A necessity to some, a pleasure to many, and I'm best enjoyed with some company. Some like it hot, some like it cold, some like it mild, and some like it bold.`,
  `The fruit of patience is sweet. So is my fruit, although I am bourne from a spiky father and a sticky mother`,
  `No matter what the gender or the name On the grand scale, we are all the same`,
  `For bestowing upon us all the necessary skills and knowledge, We want to show our love and gratitude for this college`,
  `I'm synthetic, colored, and come in different sizes. I prevent liquids from reaching their destination. I'm small and handy, but when required I expand to your satisfaction. There is wood beneath me.`,
  "Never stop dreaming.",
];
let definedSolutions = [
  "qr-M7Ubc",
  "qr-umyWf",
  "qr-ikmfZ",
  "qr-Eunvi",
  "qr-pJzqd",
  "qr-rKwEp",
  "qr-ddv98",
  "qr-hWdTY",
];

// Helper functions

const connectDB = async () => {
  try {
    await mongoose.connect(
      `${process.env.MONGODB_URL}/${process.env.MONGODB_NAME}`,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    console.log("⚡ MongoDB connected!!");
  } catch (err) {
    console.log("❌ Failed to connect to MongoDB", err);
  }
};
connectDB();
function generateFinCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codes = [];
  for (let index = 0; index < 8; index++) {
    codes.push(
      characters.charAt(Math.floor(Math.random() * characters.length))
    );
  }
  return codes;
}
// user defined shuffle
function shuffle(levels, solutions) {
  let l = [...levels];
  let s = [...solutions];
  let shuffledLevels = [];
  let shuffledSolutions = [];
  for (let index = 0; index < definedLevelQuestions.length; index++) {
    console.log(
      "index: ",
      index,
      "definedLevelQuestions.length: ",
      definedLevelQuestions.length
    );

    let randomIndex = Math.floor(Math.random() * l.length);
    shuffledLevels.push(l[randomIndex]);
    shuffledSolutions.push(s[randomIndex]);
    l.splice(randomIndex, 1);
    s.splice(randomIndex, 1);
  }
  return { shuffledLevels, shuffledSolutions };
}
// general shuffle
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getStartQuestionAndAnswer() {
  let startQuestions = [
    "What two words, added together, contain the most letters?",
    "I am easy to lift but hard to throw. What am I?",
    "What has a bottom at the top?",
    "If you drop a yellow hat in the Red Sea, what does it become?",
    "What color is the wind?",
    "The more you take, the more you leave behind. What am I?",
    "The more there is, the less you see. What am I?",
    "A word I know, six letters it contains, removes one letter, and twelve remains. What am I?",
    "What word of five letters has only one left when two letters are removed?",
    "If you have it and you show it to other people, I'm gone. What am I?",
    "My rings are not of gold, but I get more as I get old. What am I?",
    "No sooner spoken than broken. What is it?",
    "What can travel around the world while staying in a corner?",
    "Where can you finish a book without finishing a sentence?",
  ];
  let startAnswer = [
    "post office",
    "feather",
    "legs",
    "wet",
    "blew",
    "fingerprints",
    "darkness",
    "dozens",
    "stone",
    "secret",
    "tree",
    "silence",
    "stamp",
    "prison",
  ];
  let randomIndex = Math.floor(Math.random() * startQuestions.length);

  return {
    startQuestion: startQuestions[randomIndex],
    startAnswer: startAnswer[randomIndex],
  };
}

function getCaptchaQuestionAndAnswer() {
  let captchaQuestions = [
    "You see me once in November, twice in October and not at all in December. What am I?",
    "What is 3/7 chicken, 2/3 cat and 2/4 goat?",
    "I come in different sizes and curvatures. Sometimes, fluids come out of me. If you blow me, it feels really good. What am I?",
    "What four-letter word begins with “f” and ends with “k”, and if you can’t get it you can always just use your hands?",
    "White in colour, comes out from the dark, the more the little, a lady's pleasure, What am I?",
    "What gets longer if pulled, fits snugly between breasts, slides neatly into a hole, chokes people when used incorrectly, and works well when jerked?",
    "Mukund tries to attempt it, but Kavya did it, Mukund got punished but kavya didn't get punished, what were they up to?",
    "A microbiologist dies soon after his suit tears. Where was he working?",
    "Kavya forgot her laptop password, can you help her crack it. Here's the hint: 1 house 2 house 5 nightmare 4 random 2 boob 1 great",
  ];
  let captchaAnswer = [
    "o",
    "chicago",
    "nose",
    "fork",
    "pearl",
    "seatbelt",
    "suicide",
    "space",
    "hotdog",
  ];
  let randomIndex = Math.floor(Math.random() * captchaQuestions.length);
  return {
    CQuestion: captchaQuestions[randomIndex],
    CAnswer: captchaAnswer[randomIndex],
  };
}

function generateRoutes() {
  let { shuffledLevels, shuffledSolutions } = shuffle(
    definedLevelQuestions,
    definedSolutions
  );
  let finCodes = generateFinCode();
  let route = [];
  let CQmap = shuffleArray([1, 1, 0, 0, 0, 0, 0, 0]);
  for (let index = 0; index < shuffledLevels.length; index++) {
    let { CQuestion, CAnswer } = getCaptchaQuestionAndAnswer();
    route.push({
      levelQuestion: shuffledLevels[index],
      qrCodeSolution: shuffledSolutions[index],
      finCode: finCodes[index],
      captchaQuestion: CQmap[index] === 1 ? CQuestion : "",
      captchaAnswer: CQmap[index] === 1 ? CAnswer : "",
      captcha: CQmap[index] === 1 ? true : false,
    });
  }
  console.log(route);
  return route;
}

function generateAccessToken(teamID) {
  return jwt.sign({ teamID: teamID }, process.env.TOKEN_SECRET, {
    expiresIn: "7d",
  });
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null) return res.sendStatus(401);

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err) console.log(err);
    if (err) return res.sendStatus(403);
    req.user = user;

    next();
  });
}
function checkGameStatus(req, res, next) {
  if (localStorage.getItem("game-status") === "active") {
    next();
  } else {
    res.sendStatus(403);
  }
}

async function checkComplete(teamID, fincode2) {
  const team = await Team.findOne({ teamID: teamID });
  if (!team) return false;
  if (fincode2 === "middleware") {
    console.log(team.complete, "from middleware function");
    return team.complete;
  } else {
    console.log("from checkComplete function");

    if (team.current === 8) {
      console.log("from checkComplete function");

      let fincode = team.route
        .map((item) => {
          return item.finCode;
        })
        .join("-");

      let checkFincode =
        string
          .sanitize(fincode.substring(0, fincode.length - 1))
          .toLowerCase() === string.sanitize(fincode2).toLowerCase();
      console.log(string.sanitize(fincode).toLowerCase());
      console.log(string.sanitize(fincode2).toLowerCase());
      console.log(checkFincode);
      if (checkFincode) {
        await Team.findOneAndUpdate(
          { teamID: teamID },
          { complete: true, completeTime: new Date() }
        );
        return true;
      }
      return false;
    }
    return false;
  }
}

async function checkCompleteMiddleware(req, res, next) {
  let teamID = req.user.teamID;

  if (await checkComplete(teamID, "middleware")) {
    res.send({ status: "FS", message: "You have already completed the game" });
  } else {
    next();
  }
}
let rank = [];
async function calculateRank() {
  let teams = await Team.find({});
  teams = teams.sort((a, b) => {
    return b.current - a.current;
  });
  teams = teams.sort((a, b) => {
    return a.completeTime - b.completeTime;
  });

  rank = teams.map((item, index) => {
    return {
      teamID: item.teamID,
      level: item.current,
      rank: index + 1,
      completionTime: item.completeTime
        ? item.completeTime.toLocaleString()
        : "",
    };
  });
  return rank;
}

// socket.io
io.on("connection", (socket) => {
  console.log("🔗 new user connection");
});

setInterval(async () => {
  await calculateRank();
  io.emit("leaderboard", {
    rank: rank,
  });
}, 20000);

// Routes
app.get("/", (req, res) => {
  res.send("Game Status: " + localStorage.getItem("game-status"));
});

app.get("/calculateRank", (req, res) => {
  calculateRank();
  res.send({ rank });
});
app.get("/blockGame/gigachadbigcockenergyonlypls", (req, res) => {
  localStorage.setItem("game-status", "blocked");
  res.send("Game is now blocked");
});
app.get("/unblockGame/gigachadbigcockenergyonlypls", (req, res) => {
  localStorage.setItem("game-status", "active");
  res.send("Game is now active");
});
app.post("/game/registerTeam", checkGameStatus, (req, res) => {
  let teamID = uniqueNamesGenerator({
    dictionaries: [adjectives, animals],
    separator: "-",
    length: 2,
  });
  let teamRoute = generateRoutes();
  let startObj = getStartQuestionAndAnswer();

  let team = new Team({
    teamID,
    teamMembers: req.body.teamMembers,
    current: -1,
    route: teamRoute,
    startQuestion: startObj.startQuestion,
    startAnswer: startObj.startAnswer,
  });
  team.save((err, team) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.status(200).send({
        teamID,
        accessToken: generateAccessToken(teamID),
      });
    }
  });
});

app.post("/game/login", (req, res) => {
  if (req.body.masterpass !== process.env.MASTERPASS)
    return res.send({ status: "FAIL", message: "Invalid master password" });
  Team.findOne({ teamID: req.body.teamID }, (err, team) => {
    if (err) {
      res.status(500).send(err);
    } else if (!team) {
      res.status(200).send({ status: "NT", message: "Team not found" });
    } else {
      res.status(200).send({
        teamID: team.teamID,
        accessToken: generateAccessToken(team.teamID),
      });
    }
  });
});

// STATUS :
// 1. CA => Correct Answer
// 2. WA => Wrong Answer
// 2.1 WAQ => Wrong Answer and QR Code
// 2.2 WQ => Wrong QR`Code
// 3. GAS => Game is already started
// 4. GNS => Game Not Started
// 5. WC => Wrong Current --> reload page
// 6. CG => Completed Game --> take to fincode
// 7. GNF => Game not finished
// 8. FS => FinCode Submitted --> show on leaderboard, game complete
// 9. NT => Team Not Found

// TODO: make a socket server to send the players the next level
// socket server sends only rank of the team and only leader board

app.get(
  "/game/getStartQuestion",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    Team.findOne({ teamID: req.user.teamID }, (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else {
        res.status(200).send({
          startQuestion: team.startQuestion,
        });
      }
    });
  }
);

app.post(
  "/game/checkStartAnswer",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    // PARAMS => startAnswer : String
    Team.findOne({ teamID: req.user.teamID }, (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else if (team.current !== -1) {
        res.status(200).send({
          status: "GAS",
          message: "You have already started the game",
        });
      } else {
        console.log(team, req.user);
        if (
          team.startAnswer.trim().toLowerCase() ===
          req.body.startAnswer.trim().toLowerCase()
        ) {
          team.current = 0;
          team.save();
          //emit to player the next question
          calculateRank();
          io.emit("leaderboard", {
            rank: rank,
          });
          res.status(200).send({
            status: "CA",
            nextQuestion: team.route[team.current].levelQuestion,
            nextCaptchaQuestion: team.route[team.current].captchaQuestion,
            current: team.current,
            captcha: team.route[team.current].captcha,
          });
        } else {
          res.status(200).send({ status: "WA" });
        }
      }
    });
  }
);

app.get(
  "/game/getQuestion",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    Team.findOne({ teamID: req.user.teamID }, (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else {
        if (!team)
          return res.send({ status: "TNF", message: "Team not found" });
        if (team.current === -1) {
          res.status(200).send({
            status: "GNS",
            message: "You have not started the game yet",
          });
        } else if (team.current === 8) {
          res.status(200).send({
            status: "CG",
            message: "You have completed the game",
          });
        } else {
          res.status(200).send({
            question: team.route[team.current].levelQuestion,
            current: team.current,
            captcha: team.route[team.current].captcha,
            cquestion: team.route[team.current].captchaQuestion,
          });
        }
      }
    });
  }
);

app.post(
  "/game/checkAnswer",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  (req, res) => {
    // PARAMS =>  captchaAnswer : String, qrCodeSolution : String, current : Number
    Team.findOne({ teamID: req.user.teamID }, async (err, team) => {
      if (err) {
        res.status(500).send(err);
      } else if (team.current === -1) {
        res.status(200).send({
          status: "GNS",
          message: "You have not started the game yet",
        });
      } else if (team.current === 8) {
        res.status(200).send({
          status: "CG",
          message: "You have completed the game",
        });
      } else if (team.current !== req.body.current) {
        res.status(200).send({
          status: "WC",
          message: "Out of sync",
        });
      } else {
        let checkQR =
          team.route[team.current].qrCodeSolution.trim().toLowerCase() ===
          req.body.qrCodeSolution.trim().toLowerCase();
        let checkCaptcha = team.route[team.current].captcha
          ? team.route[team.current].captchaAnswer.trim().toLowerCase() ===
            req.body.captchaAnswer.trim().toLowerCase()
          : true;

        // let checkAnswerWithCaptcha = team.route[team.current].captcha
        //   ? team.route[team.current].captchaAnswer.trim().toLowerCase() ===
        //       req.body.captchaAnswer.trim().toLowerCase() &&
        //     team.route[team.current].qrCodeSolution.trim().toLowerCase() ===
        //       req.body.qrCodeSolution.trim().toLowerCase()
        //   : team.route[team.current].qrCodeSolution.trim().toLowerCase() ===
        //     req.body.qrCodeSolution.trim().toLowerCase();

        if (checkCaptcha && checkQR) {
          team.current = team.current + 1;
          await team.save();
          console.log("CURRENT:", team.current);

          if (team.current === 8) {
            res.status(200).send({
              status: "CG",
              message: "You have completed the game",
            });
          } else {
            calculateRank();
            io.emit("leaderboard", {
              rank: rank,
            });
            console.log("CA");
            return res.status(200).send({
              status: "CA",
              nextQuestion: team.route[team.current].levelQuestion,
              nextCaptchaQuestion: team.route[team.current].captchaQuestion,
              current: team.current,
              finCode: team.route[team.current - 1].finCode,
            });
          }
        }
        if (!checkCaptcha && !checkQR) {
          console.log("WAQ");

          return res.status(200).send({
            status: "WAQ",
            message: "Wrong answer",
          });
        }
        if (!checkCaptcha && checkQR) {
          console.log("WA");

          return res.status(200).send({
            status: "WA",
            message: "Wrong answer",
          });
        }
        if (!checkQR && checkCaptcha) {
          console.log("WQ");

          return res.status(200).send({ status: "WQ" });
        }
      }
    });
  }
);

app.post(
  "/game/checkFincode",
  [authenticateToken, checkGameStatus, checkCompleteMiddleware],
  async (req, res) => {
    // PARAMS =>  finCode : String
    if (await checkComplete(req.user.teamID, req.body.fincode)) {
      console.log("Game Completed: " + req.user.teamID);
      res.status(200).send({
        status: "FS",
        message: "You have completed the game",
      });
    } else {
      res.status(200).send({ status: "WA" });
    }
  }
);
