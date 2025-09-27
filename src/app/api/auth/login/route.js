import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const client = new MongoClient(process.env.MONGODB_URI);
const dbName = "SeguridadDB";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, password } = body;

    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("SeguridadClass");
    const intentosLogs = db.collection("IntentosLogs");

    const now = new Date();

    // obtener ip
    const ip = req.headers.get("x-forwarded-for");

    // ahora por ip
    const attempts = await attemptsCollection.countDocuments({
      ip,
      createdAt: { $gt: new Date(now - windowMinutes * 60 * 1000) }
    });

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: "Demasiados intentos. Intenta más tarde." },
        { status: 429 }
      );
    }
  

    const user = await users.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" }, // ambiguedad a proposito
        { status: 401 }
      );
    }

    const contraseniaValida = await bcrypt.compare(password, user.password);
    if (!contraseniaValida) {
      await intentosLogs.insertOne({ email, timestamp: new Date() }); // guardar en la bd el intento fallido
      return NextResponse.json(
        { error: "Correo o contraseña incorrectos" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { email: user.email, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const response = NextResponse.json({
      message: "Login exitoso",
      user: {
        email: user.email,
        rol: user.rol,
      },
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "strict", 
      path: "/",
      maxAge: 60 * 60, // 1 hora
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
