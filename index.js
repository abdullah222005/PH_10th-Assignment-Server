const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 1111;

//middleware
app.use(cors());
app.use(express.json());

const uri =
  "mongodb+srv://the-book-heaven_DB:dyp4h4hJR9xvuSre@cluster0.gh1jtid.mongodb.net/?appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

app.get("/", (req, res) => {
  res.send("smart server is running..!!!");
});

async function run() {
  try {
    await client.connect();
    const db = client.db('the-book-heaven_DB');
    const booksCollection = db.collection('all-books');

    app.get('/all-books', async (req, res)=>{
        const cursor = booksCollection.find();
        const result = await cursor.toArray();
        res.send(result);
    })

    app.get('/book-details/:id', async(req, res)=>{
        const id = req.params.id;
        const query = {_id: new ObjectId(id)}
        const result = await booksCollection.findOne(query);
        res.send(result);
    })



    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Smart server is running on port: ${port}`);
});
