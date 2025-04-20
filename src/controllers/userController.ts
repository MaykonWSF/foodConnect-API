import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import jwt, { JwtPayload } from 'jsonwebtoken';

const prisma = new PrismaClient();

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const registerUser = async (req: Request, res: Response)=> {
  const { nome, email, senha, telefone, endereco, perfilUsuario, nomeOrganizacao } = req.body;

  if (!email || !senha || !nome || !perfilUsuario || !telefone || !endereco || !nomeOrganizacao) {
    return res.status(400).json({ error: "Campos necessários do usuário são obrigatórios." });
  }

  try {
    const existingUser = await prisma.usuarios.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Email já registrado' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuarios.create({
      data: {
        nome,
        email,
        senha: hashedPassword,
        telefone,
        endereco,
        perfilUsuario,
        nomeOrganizacao,
        dataCadastro: new Date(),
        lastLogin: new Date(),
        status: "ATIVO"
      }
    });

    const token = jwt.sign(
      { idUsuario: usuario.idUsuario, email: usuario.email, perfilUsuario: usuario.perfilUsuario },
      process.env.JWT_SECRET as string,
      { expiresIn: "24h" }
    );

    return res.status(201).json({ usuario, token });
  } catch (error) {
    console.error('Erro ao cadastrar usuário:', error);
    return res.status(500).json({ message: 'Erro ao cadastrar usuário', error });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email, senha } = req.body;

  try {
    const usuario = await prisma.usuarios.findUnique({
      where: { email },
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const isPasswordValid = await bcrypt.compare(senha, usuario.senha);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Senha incorreta' });
    }

    const token = jwt.sign(
      { userId: usuario.idUsuario, email: usuario.email, perfil: usuario.perfilUsuario },
      process.env.JWT_SECRET!,
      { expiresIn: '2h' }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 24 * 60 * 60 * 1000, // Expira em 24 horas
    });

    const updateLogin = await prisma.usuarios.update({
      where: { idUsuario: usuario.idUsuario },
      data: {
        lastLogin: new Date(),
      },
    });

    return res.json({ message: "Login bem-sucedido!", 
    user: { 
      id: usuario.idUsuario, 
      nameUser: usuario.nome, 
      email: usuario.email, 
      lastLogin: updateLogin.lastLogin},
     });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ message: 'Erro ao fazer login', error });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  res.clearCookie("token"); 
  res.status(200).json({ message: "Logout realizado com sucesso!" });
};

export const getUserProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const idUsuario = (req.user as JwtPayload)?.userId;

  if (!idUsuario) {
    res.status(401).json({ message: "Usuário não autenticado." });
    return;
  }

  const usuario = await prisma.usuarios.findUnique({
    where: { idUsuario },
    select: {
      idUsuario: true,
      nome: true,
      email: true,
      telefone: true,
      endereco: true,
      perfilUsuario: true,
      nomeOrganizacao: true,
      dataCadastro: true,
      lastLogin: true,
      status: true,
    },
  });

  if (!usuario) {
    res.status(404).json({ message: "Usuário não encontrado." });
    return;
  }

  res.status(200).json({ usuario });
};