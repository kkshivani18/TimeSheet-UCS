
const {z} = require('zod')

// user signup
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const userSignUpSchema = z.object({
    username: z.string().min(1, "Username is required"),
    email: z.string().email(),
    password: z.string().min(8, "Password must be atleast 8 characters").regex(passwordRegex, "Password must include a capital letter, number and special character."),
});

const userLoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "Password must be atleast 8 characters")
})

module.exports = {
    userSignUpSchema,
    userLoginSchema
}