import app from "./app.js";
import dotenv from 'dotenv';

const PORT = process.env.PORT;

app.listen(PORT, () => {
    console.log(`Server is running ${PORT}`);
})