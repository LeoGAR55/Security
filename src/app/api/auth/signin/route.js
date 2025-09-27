import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import bcrypt from "bcryptjs";

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "SeguridadDB"; 

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo y contraseña son requeridos" },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("SeguridadClass");

    
    const exists = await users.findOne({ email });
    if (exists) {
      return NextResponse.json(
        { error: "El correo ya está registrado" },
        { status: 400 }
      );
    }
    // hasheo de la contraseña en texto plano
    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = {
      email,
      password: hashPassword, // pasamos la contraseña ya hasheada
      rol: "2", 
    };

    await users.insertOne(newUser);

    return NextResponse.json({ message: "Usuario creado con éxito", user: newUser });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
