// ImportClientsModal.tsx - Modal para importar clientes desde un archivo Excel (.xlsx o .xls)
// ✅ Incluye nombre de campaña (opcional) y lo envía a la Edge Function como campaign_name

import { useState, useRef } from "react";
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import LoadingSpinner from "./LoadingSpinner";

interface ImportClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

interface ImportResult {
  success: number;
  errors: string[];
}

export default function ImportClientsModal({
  isOpen,
  onClose,
  onImport,
}: ImportClientsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const isExcel =
      selectedFile.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      selectedFile.type === "application/vnd.ms-excel" ||
      selectedFile.name.toLowerCase().endsWith(".xlsx") ||
      selectedFile.name.toLowerCase().endsWith(".xls");

    if (isExcel) {
      setFile(selectedFile);
      setError("");
      setResult(null);
    } else {
      setError("Por favor, selecciona un archivo Excel válido (.xlsx o .xls)");
      setFile(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      // Procesar el archivo Excel en el frontend
      const clientsData = await processExcelFile(file);

      if (clientsData.length === 0) {
        setError("No se encontraron datos válidos en el archivo");
        return;
      }

      // Enviar los datos procesados a la Edge Function
      const { data, error: importError } = await supabase.functions.invoke(
        "import-clients",
        {
          body: {
            clients: clientsData,
            campaign_name: campaignName.trim() || null,
          },
        },
      );

      if (importError) {
        setError(importError.message);
        return;
      }

      setResult(data);
      if (data?.success > 0) {
        onImport();
      }
    } catch (err: any) {
      setError(err?.message || "Error inesperado al importar el archivo");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Normaliza headers para soportar:
   * - acentos: "Teléfono" -> "telefono"
   * - signos: "E-mail" -> "e mail"
   * - guiones/underscores: "deposit_amount" -> "deposit amount"
   * - paréntesis: "Brand Name (Broker)" -> "brand name broker"
   */
  const normalizeHeader = (h: any) =>
    (h ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  /**
   * Mapeo de nombres de columnas (tolerante a ES/EN y variantes comunes).
   * OJO: Las keys aquí deben estar en formato normalizado (usa normalizeHeader).
   */
  const COLUMN_MAPPING: Record<string, string> = {
    // ========== NOMBRE / APELLIDO / FULL NAME ==========
    // first_name
    nombre: "first_name",
    nombres: "first_name",
    "primer nombre": "first_name",
    "nombre cliente": "first_name",
    "nombre del cliente": "first_name",
    firstname: "first_name",
    "first name": "first_name",
    "given name": "first_name",

    // last_name
    apellido: "last_name",
    apellidos: "last_name",
    "segundo nombre": "last_name", // ojo: a veces es middle name
    lastname: "last_name",
    "last name": "last_name",
    surname: "last_name",
    "family name": "last_name",

    // full_name (se parte a first/last si faltan)
    name: "full_name", // se usa como full name si no hay first/last
    "full name": "full_name",
    fullname: "full_name",
    "nombre completo": "full_name",
    "nombres y apellidos": "full_name",
    "client name": "full_name",
    "customer name": "full_name",

    // ========== CONTACTO ==========
    email: "email",
    correo: "email",
    "correo electronico": "email",
    "e mail": "email",
    "e mail address": "email",
    mail: "email",
    "email address": "email",
    "contact email": "email",

    telefono: "phone_number",
    "telefono celular": "phone_number",
    "numero telefono": "phone_number",
    tel: "phone_number",
    celular: "phone_number",
    movil: "phone_number",
    whatsapp: "phone_number",
    phone: "phone_number",
    "phone number": "phone_number",
    mobile: "phone_number",
    cell: "phone_number",
    cellphone: "phone_number",

    // ========== UBICACIÓN ==========
    pais: "country",
    "pais de residencia": "country",
    country: "country",
    "country of residence": "country",
    nationality: "country",
    location: "country",

    // ========== SOURCE / BROKER / EMPRESA / CAMPAÑA ==========
    empresa: "source",
    fuente: "source",
    origen: "source",
    source: "source",
    company: "source",
    broker: "source",
    brand: "source",
    "brand name": "source",
    "brand name broker": "source",
    campaign: "source",
    campana: "source",

    // ========== FUNNEL / ETAPA ==========
    funnel: "funnel",
    embudo: "funnel",
    etapa: "funnel",
    fase: "funnel",
    stage: "funnel",
    pipeline: "funnel",
    status: "funnel",

    // ========== MONTOS ==========
    deposit_amount: "deposit_amount",
    "deposit amount": "deposit_amount",
    deposito: "deposit_amount",
    "monto depositado": "deposit_amount",
    monto: "deposit_amount",
    cantidad: "deposit_amount",
    valor: "deposit_amount",
    importe: "deposit_amount",
    deposit: "deposit_amount",
    amount: "deposit_amount",
    "total deposit": "deposit_amount",
    "total deposited": "deposit_amount",

    net_deposit: "net_deposit",
    "net deposit": "net_deposit",
    neto: "net_deposit",
    "monto neto": "net_deposit",
    "deposito neto": "net_deposit",
    "net amount": "net_deposit",

    user_balance: "user_balance",
    "user balance": "user_balance",
    balance: "user_balance",
    saldo: "user_balance",
    "saldo usuario": "user_balance",
    "account balance": "user_balance",
    equity: "user_balance",
    capital: "user_balance",
    wallet: "user_balance",
    "wallet balance": "user_balance",

    // ========== FECHAS ==========
    "fecha inversion": "investment_date",
    "fecha inversion 1": "investment_date",
    fecha_inversion: "investment_date",
    "investment date": "investment_date",
    investment_date: "investment_date",
    "fecha deposito": "investment_date",
    "fecha de deposito": "investment_date",
    "deposit date": "investment_date",
    depositdate: "investment_date",
    date: "investment_date",
    fecha: "investment_date",

    // ========== OPCIONALES ==========
    currency: "currency",
    moneda: "currency",
    divisa: "currency",
    "signup date": "signup_date",
    signupdate: "signup_date",
    "registration date": "signup_date",
    "fecha registro": "signup_date",
    registro: "signup_date",
  };

  const processExcelFile = async (file: File): Promise<any[]> => {
    const XLSX = await import("xlsx");

    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);

            const workbook = XLSX.read(data, {
              type: "array",
              cellDates: true,
            });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: "",
            });

            if (jsonData.length < 2) {
              throw new Error(
                "El archivo debe tener al menos una fila de encabezados y una fila de datos",
              );
            }

            const rawHeaders = jsonData[0].map((h: any) =>
              (h ?? "").toString(),
            );
            const normalizedHeaders = rawHeaders.map(normalizeHeader);

            const indexToField: Record<number, string> = {};
            for (let i = 0; i < normalizedHeaders.length; i++) {
              const nh = normalizedHeaders[i];
              if (!nh) continue;

              const fieldName = COLUMN_MAPPING[nh];
              if (fieldName) indexToField[i] = fieldName;
            }

            const clients: any[] = [];

            const parseNumber = (v: any) => {
              const s = v?.toString?.() ?? "";
              const num = parseFloat(s.replace(/[^0-9.-]/g, ""));
              return Number.isFinite(num) ? num : undefined;
            };

            const parseDateISO = (v: any): string | undefined => {
              if (!v && v !== 0) return undefined;

              if (v instanceof Date && !isNaN(v.getTime())) {
                return v.toISOString().split("T")[0];
              }

              if (typeof v === "number") {
                const d = XLSX.SSF.parse_date_code(v);
                if (d && d.y && d.m && d.d) {
                  const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
                  if (!isNaN(dt.getTime()))
                    return dt.toISOString().split("T")[0];
                }
                return undefined;
              }

              const dt = new Date(v);
              if (!isNaN(dt.getTime())) return dt.toISOString().split("T")[0];
              return undefined;
            };

            for (let r = 1; r < jsonData.length; r++) {
              const row = jsonData[r];
              if (!row || row.length === 0) continue;

              const client: any = {};

              for (let c = 0; c < normalizedHeaders.length; c++) {
                const fieldName = indexToField[c];
                if (!fieldName) continue;

                const cellValue = row[c];
                if (
                  cellValue === undefined ||
                  cellValue === null ||
                  cellValue === ""
                )
                  continue;

                if (
                  ["deposit_amount", "net_deposit", "user_balance"].includes(
                    fieldName,
                  )
                ) {
                  const num = parseNumber(cellValue);
                  if (num !== undefined) client[fieldName] = num;
                  continue;
                }

                if (
                  fieldName === "investment_date" ||
                  fieldName === "signup_date"
                ) {
                  const iso = parseDateISO(cellValue);
                  if (iso) client[fieldName] = iso;
                  continue;
                }

                client[fieldName] = cellValue.toString().trim();
              }

              if (!client.first_name && client.full_name) {
                const parts = client.full_name
                  .toString()
                  .trim()
                  .split(/\s+/)
                  .filter(Boolean);

                if (parts.length > 0) {
                  client.first_name = parts.shift();
                  const rest = parts.join(" ").trim();
                  if (rest) client.last_name = rest;
                }

                delete client.full_name;
              }

              const hasIdentity =
                !!client.first_name || !!client.email || !!client.phone_number;

              if (hasIdentity) clients.push(client);
            }

            resolve(clients);
          } catch (err: any) {
            reject(err);
          }
        };

        reader.onerror = () => reject(new Error("Error leyendo el archivo"));
        reader.readAsArrayBuffer(file);
      } catch (xlsxError: any) {
        reject(
          new Error(
            "Error cargando librería XLSX: " +
              (xlsxError?.message || xlsxError),
          ),
        );
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setCampaignName("");
    setError("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <FileSpreadsheet className="w-6 h-6 mr-2 text-green-600" />
            Importar Clientes desde Excel
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Instrucciones */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 mb-2">
              Instrucciones para el archivo Excel:
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                El archivo debe contener columnas reconocibles (en cualquier
                orden). Se aceptan variantes comunes en español/inglés.
              </li>
              <li className="ml-4">
                • <strong>Nombre:</strong> Nombre / First Name / Full Name
              </li>
              <li className="ml-4">
                • <strong>Apellido:</strong> Apellido / Last Name (opcional si
                usas Full Name)
              </li>
              <li className="ml-4">
                • <strong>Email:</strong> Email / Correo
              </li>
              <li className="ml-4">
                • <strong>Teléfono:</strong> Teléfono / Phone / Mobile /
                WhatsApp
              </li>
              <li className="ml-4">
                • <strong>País:</strong> País / Country
              </li>
              <li className="ml-4">
                • <strong>Fuente:</strong> Empresa / Source / Broker / Brand
              </li>
              <li className="ml-4">
                • <strong>Embudo:</strong> Funnel / Stage / Pipeline
              </li>
              <li className="ml-4">
                • <strong>Montos:</strong> Deposit Amount / Amount / Net Deposit
                / Balance
              </li>
              <li className="ml-4">
                • <strong>Fecha:</strong> Investment Date / Deposit Date / Fecha
                inversión
              </li>
              <li>
                • <strong>Columnas opcionales:</strong> Si falta alguna columna,
                se dejará vacía
              </li>
              <br />
              <li>
                • <strong>De preferencia no incluyas:</strong> Color, Serie,
                tipificación, Comentarios (se ignorarán, pero pueden generar
                confusión o errores si están presentes)
              </li>
            </ul>
          </div>

          {/* Nombre campaña */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de campaña (opcional)
            </label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Ej: EZinvest Feb 20 / Reactivación MX"
              className="input-field"
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Esto solo es una etiqueta para identificar la campaña. El prefijo
              (A/B/C) se mantiene igual.
            </p>
          </div>

          {/* Selección de archivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar archivo Excel
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-gray-400 transition-colors">
              <div className="space-y-1 text-center">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Seleccionar archivo</span>
                    <input
                      ref={fileInputRef}
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      disabled={loading}
                    />
                  </label>
                  <p className="pl-1">o arrastra y suelta aquí</p>
                </div>
                <p className="text-xs text-gray-500">XLSX, XLS hasta 10MB</p>
              </div>
            </div>

            {file && (
              <div className="mt-2 flex items-center text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                {file.name}
              </div>
            )}
          </div>

          {/* Errores */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Resultado de la importación */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                <p className="text-green-600 text-sm">
                  Se importaron {result.success} clientes correctamente
                </p>
              </div>

              {result.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-red-600 font-medium">
                    Errores encontrados:
                  </p>
                  <ul className="text-xs text-red-600 mt-1 space-y-1">
                    {result.errors.map((err, index) => (
                      <li key={index}>• {err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="btn-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="btn-primary flex items-center"
          >
            {loading ? (
              <LoadingSpinner
                size="sm"
                text="Importando..."
                fullScreen={false}
              />
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar Clientes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
