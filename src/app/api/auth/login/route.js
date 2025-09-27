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
    const tiempo = 15;
    const maxIntentos = 5;

    // en los documentos del email especificado buscamos los intentos mayor que ($gt)
    // hace 15 minutos
    const intentos = await intentosLogs.countDocuments({
      email,
      // cconvertir 15 min a milisegunos: 15 min * 60s *1000 miliseg
      // porque date llora si no son milisegundos
      timestamp: { $gt: new Date(now - tiempo * 60 * 1000) }
    });

    if (intentos >= maxIntentos) {
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
