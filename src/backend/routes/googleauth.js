// const express = require('express');
// const jwt = require('jsonwebtoken'); // Add this import
// const { nanoid } = require('nanoid'); // Add this import
// const axios = require('axios'); // Add this import
// const User = require('../models/User');
// const bcrypt = require('bcryptjs');
// const router = express.Router();

// router.post('/googleauth', async (req, res) => {
//     try {
//         const { token } = req.body;

//         // Verify token with Google
//         const googleResponse = await axios.get(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
//         const { email, id: googleId, name } = googleResponse.data;

//         // Check if user exists
//         let user = await User.findOne({ 
//             $or: [
//                 { email: email },
//                 { googleId: googleId }
//             ]
//         });

//         if (!user) {
//             // Create new user
//             user = new User({
//                 userId: nanoid(28),
//                 email,
//                 googleId,
//                 username: name,
//                 authProvider: 'google',
//                 role: 'user',
//                 passwordHash: await bcrypt.hash(nanoid(), 12) 
//             });
//             await user.save();
//         } else if (!user.googleId) {
//             // Link existing user with Google
//             user.googleId = googleId;
//             user.authProvider = 'google';
//             await user.save();
//         }

//         // Generate JWT token
//         const jwtToken = jwt.sign(
//             { 
//                 id: user._id, 
//                 userId: user.userId, 
//                 email: user.email, 
//                 role: user.role 
//             }, 
//             process.env.JWT_SECRET, 
//             { expiresIn: '1d' }
//         );

//         res.json({ 
//             token: jwtToken, 
//             userId: user.userId, 
//             username: user.username, 
//             role: user.role 
//         });
//     } catch (error) {
//         console.error('Google auth error:', error);
//         res.status(500).json({ message: 'Authentication failed' });
//     }
// });

// module.exports = router;

// // const express = require('express');
// // const { userSignUpSchema, userLoginSchema } = require('../models/user.zod');
// // const User = require('../models/User');
// // const bcrypt = require('bcryptjs');
// // const router = express.Router();

// // router.post('/googleauth', async (req, res) => {
// //     try {
// //         const { email, googleId, name } = req.body;

// //         // if user exists
// //         let user = await User.findOne({ 
// //             $or: [
// //                 { email: email },
// //                 { googleId: googleId }
// //             ]
// //         });

// //         if (!user) {
// //             user = new User({
// //                 userId: nanoid(28),
// //                 email,
// //                 googleId,
// //                 username: name,
// //                 authProvider: 'google',
// //                 role: 'user',
// //                 passwordHash: await bcrypt.hash(nanoid(), 12) 
// //             });
// //             await user.save();
// //         } else if (!user.googleId) {
// //             user.googleId = googleId;
// //             user.authProvider = 'google';
// //             await user.save();
// //         }

// //         // generate JWT token
// //         const token = jwt.sign(
// //             { 
// //                 id: user._id, 
// //                 userId: user.userId, 
// //                 email: user.email, 
// //                 role: user.role 
// //             }, 
// //             process.env.JWT_SECRET, 
// //             { expiresIn: '1d' }
// //         );

// //         res.json({ 
// //             token, 
// //             userId: user.userId, 
// //             username: user.username, 
// //             role: user.role 
// //         });
// //     } catch (error) {
// //         console.error('Google auth error:', error);
// //         res.status(500).json({ message: 'Authentication failed' });
// //     }
// // });

// // module.exports = router;