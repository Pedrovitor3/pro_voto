// src/app/emendas/page.tsx - updated with auth context
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { RootLayout } from "@/components/Layout";
import { EmendaCard } from "@/components/ui/Card/EmendaCard";
import { Button } from "@/components/ui/Button";
import {
  useNotifications,
  NotificationsProvider,
} from "@/components/ui/Notification";
import { EmendaFormModal } from "@/components/ui/Modal/ModalEmenda";
import { useAuth } from "@/contexts/AuthContext";

interface Emenda {
  id: number;
  titulo: string;
  descricao: string;
  dataApresentacao: string;
  status: "pendente" | "em_votacao" | "aprovada" | "reprovada";
}

// Configuração do Axios com baseURL relativa
const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Set up Axios interceptor to include auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function EmendasContent() {
  const [emendas, setEmendas] = useState<Emenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [emendaEmEdicao, setEmendaEmEdicao] = useState<Emenda | undefined>(
    undefined
  );

  // Use the auth context
  const { isAdmin } = useAuth();
  const { addNotification } = useNotifications();

  // Carregar as emendas ao iniciar
  useEffect(() => {
    carregarEmendas();
  }, []);

  async function carregarEmendas() {
    try {
      setLoading(true);

      // Usando Axios para buscar as emendas
      const response = await api.get("/emendas");
      setEmendas(response.data);
      setError(null);
    } catch (err) {
      console.error("Erro ao carregar emendas:", err);

      // Tratamento de erro do Axios
      if (axios.isAxiosError(err)) {
        // Verificar se é um erro de rede
        if (err.code === "ECONNABORTED" || !err.response) {
          const errorMessage =
            "Erro de conexão com o servidor. Verifique se o servidor da API está em execução.";
          setError(new Error(errorMessage));
          addNotification(errorMessage, "error");
        } else {
          const errorMessage =
            err.response?.data?.error ||
            `Erro ao carregar emendas: ${err.message}`;
          setError(new Error(errorMessage));
          addNotification(errorMessage, "error");
        }
      } else {
        setError(
          err instanceof Error ? err : new Error("Erro ao carregar emendas")
        );
        addNotification("Erro ao carregar emendas", "error");
      }
    } finally {
      setLoading(false);
    }
  }

  const handleIniciarVotacao = async (id: number) => {
    try {
      // Usando Axios para iniciar a votação
      await api.post(`/emendas/${id}/iniciar-votacao`);

      // Recarregar emendas para atualizar a lista
      await carregarEmendas();

      addNotification(`Votação iniciada para a emenda #${id}`, "success");
    } catch (err) {
      console.error("Erro ao iniciar votação:", err);

      // Tratamento de erro do Axios
      if (axios.isAxiosError(err)) {
        // Verificar se é um erro de rede
        if (err.code === "ECONNABORTED" || !err.response) {
          addNotification(
            "Erro de conexão com o servidor. Verifique se o servidor da API está em execução.",
            "error"
          );
        } else {
          const errorMessage =
            err.response?.data?.error ||
            `Erro ao iniciar votação: ${err.message}`;
          addNotification(errorMessage, "error");
        }
      } else {
        addNotification("Erro ao iniciar votação", "error");
      }
    }
  };

  const handleVerDetalhes = (id: number) => {
    // Em uma implementação real, redirecionaria para a página de detalhes
    window.location.href = `/emendas/${id}`;
  };

  const handleEditar = (id: number) => {
    const emenda = emendas.find((e) => e.id === id);
    if (emenda) {
      setEmendaEmEdicao(emenda);
      setIsModalOpen(true);
    }
  };

  const handleNovaEmenda = () => {
    setEmendaEmEdicao(undefined);
    setIsModalOpen(true);
  };

  const handleSalvarEmenda = async (emendaData: any) => {
    const isEditMode = !!emendaEmEdicao;

    try {
      if (isEditMode) {
        // Atualizar emenda existente usando Axios
        await api.put(`/emendas/${emendaEmEdicao!.id}`, emendaData);
        addNotification("Emenda atualizada com sucesso!", "success");
      } else {
        // Criar nova emenda usando Axios
        console.log("Enviando dados para criar emenda:", emendaData);
        const response = await api.post("/emendas", {
          titulo: emendaData.titulo,
          descricao: emendaData.descricao,
        });
        console.log("Resposta da API:", response.data);
        addNotification("Emenda criada com sucesso!", "success");
      }

      // Fechar o modal depois de salvar
      setIsModalOpen(false);

      // Recarregar emendas para atualizar a lista
      await carregarEmendas();
    } catch (err) {
      console.error(
        `Erro ao ${isEditMode ? "atualizar" : "criar"} emenda:`,
        err
      );

      // Tratamento de erro do Axios
      if (axios.isAxiosError(err)) {
        // Verificar se é um erro de rede
        if (err.code === "ECONNABORTED" || !err.response) {
          const errorMessage =
            "Erro de conexão com o servidor. Verifique se o servidor da API está em execução.";
          addNotification(errorMessage, "error");
          throw new Error(errorMessage);
        } else {
          const errorMessage =
            err.response?.data?.error ||
            `Erro ao ${isEditMode ? "atualizar" : "criar"} emenda: ${
              err.message
            }`;
          addNotification(errorMessage, "error");
          throw new Error(errorMessage);
        }
      } else {
        addNotification(
          `Erro ao ${isEditMode ? "atualizar" : "criar"} emenda`,
          "error"
        );
        throw err; // Propagar o erro para ser tratado no componente do modal
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Emendas</h1>

        {isAdmin && (
          <Button variant="primary" onClick={handleNovaEmenda}>
            Nova Emenda
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
          <h3 className="font-semibold mb-2">Erro ao carregar emendas</h3>
          <p>{error.message}</p>
          <div className="mt-4">
            <Button variant="secondary" size="sm" onClick={carregarEmendas}>
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : emendas.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-100 text-yellow-800 rounded-md p-4">
          <p>Nenhuma emenda encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {emendas.map((emenda) => (
            <EmendaCard
              key={emenda.id}
              id={emenda.id}
              titulo={emenda.titulo}
              descricao={emenda.descricao}
              dataApresentacao={emenda.dataApresentacao}
              status={emenda.status}
              onIniciarVotacao={handleIniciarVotacao}
              onVerDetalhes={handleVerDetalhes}
              onEditar={handleEditar}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Modal para criar/editar emendas */}
      <EmendaFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        emenda={emendaEmEdicao}
        onSave={handleSalvarEmenda}
      />
    </div>
  );
}

export default function EmendasPage() {
  return (
    <NotificationsProvider>
      <RootLayout>
        <div className="container mx-auto py-8 px-4">
          <EmendasContent />
        </div>
      </RootLayout>
    </NotificationsProvider>
  );
}
