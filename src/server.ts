import app from './app';

const PORT = parseInt(process.env.PORT!);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
