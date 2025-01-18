async function run(){
    const { MongoClient, ServerApiVersion } = require('mongodb');
    const uri = "mongodb+srv://Admin:5rdQf3SRYsst1GSn@chatapp.h0po0.mongodb.net/?retryWrites=true&w=majority&appName=ChatApp";
    const client = new MongoClient(uri, {
      serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
      }
    });
    await client.connect();
    const db = client.db("SnippetData");
    const collection = db.collection("Comptes");
    const document = await collection.find().toArray();
    for (Compte of document){
      await collection.updateOne({_id:Compte._id},{$set:{isVanished:false}})
    }
    await client.close();
    }
run()
