import { AlertTriangle, BadgeInfo, Banknote, CheckSquare, Clock, Edit, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  Cargo,
  DescuentoAplicado,
  FuncionTrabajador,
  PagoNomina,
  RrhhBackupData,
  Trabajador,
} from "../../accounting/core/types/accountingTypes";
import {
  CATEGORIA_LABELS,
  CONTRATO_LABELS,
  ESTADO_LABELS,
  FORMAPAGO_LABELS,
  MESES_CORTOS,
  MODOTRABAJO_LABELS,
  aRomano,
  cargoDe,
  copiarFuncionesDeCargoATrabajador,
  salarioActualDe,
  sugerirDescuentos,
  formatFecha,
  formatMoney,
  nuevoId,
  nombreCompleto,
  pagoPagado,
  totalDescuentos,
  totalNeto,
} from "./helpers";
import type { RrhhTabProps } from "./props";

type EstadoTrabajador = Trabajador["estado"];
type TipoContrato = Trabajador["tipoContrato"];
type FormaPago = Trabajador["formaPago"];
type ModoTrabajo = Trabajador["modoTrabajo"];

/** 12 periodos (mes, anio) terminando en el más reciente. */
function ultimosPeriodos(count = 12): Array<{ mes: number; anio: number }> {
  const ahora = new Date();
  return Array.from({ length: count }, (_, offset) => {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - offset, 1);
    return { mes: fecha.getMonth() + 1, anio: fecha.getFullYear() };
  });
}

const aInputFecha = (epoch: number | null | undefined): string => {
  if (!epoch) return "";
  const fecha = new Date(epoch);
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${fecha.getFullYear()}-${mes}-${dia}`;
};

const desdeInputFecha = (valor: string): number | null => {
  if (!valor) return null;
  const [anio, mes, dia] = valor.split("-").map(Number);
  return new Date(anio, mes - 1, dia).getTime();
};

export function TrabajadoresTab({ rrhh, saving, onSave }: RrhhTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<Trabajador | null>(null);
  const [aEliminar, setAEliminar] = useState<Trabajador | null>(null);
  const [funcionesAbiertas, setFuncionesAbiertas] = useState<Trabajador | null>(null);
  const [pagosAbiertos, setPagosAbiertos] = useState<Trabajador | null>(null);

  const sinCargos = rrhh.cargos.length === 0;
  const trabajadoresOrdenados = useMemo(
    () =>
      [...rrhh.trabajadores].sort((a, b) =>
        nombreCompleto(a).localeCompare(nombreCompleto(b)),
      ),
    [rrhh.trabajadores],
  );

  const guardarTrabajador = (trabajador: Trabajador) => {
    const existe = rrhh.trabajadores.some((t) => t.id === trabajador.id);
    const trabajadores = existe
      ? rrhh.trabajadores.map((t) => (t.id === trabajador.id ? trabajador : t))
      : [...rrhh.trabajadores, trabajador];
    onSave(
      { ...rrhh, trabajadores },
      {
        title: "Trabajador guardado",
        description: nombreCompleto(trabajador) || "Trabajador actualizado",
      },
    );
  };

  const eliminarTrabajador = (trabajador: Trabajador) => {
    onSave(
      {
        ...rrhh,
        trabajadores: rrhh.trabajadores.filter((t) => t.id !== trabajador.id),
        funcionesTrabajador: rrhh.funcionesTrabajador.filter(
          (f) => f.trabajadorId !== trabajador.id,
        ),
        pagosNomina: rrhh.pagosNomina.filter(
          (p) => p.trabajadorId !== trabajador.id,
        ),
      },
      {
        title: "Trabajador eliminado",
        description: nombreCompleto(trabajador),
      },
    );
  };

  const guardarFunciones = (trabajadorId: string, funciones: FuncionTrabajador[]) => {
    onSave(
      {
        ...rrhh,
        funcionesTrabajador: [
          ...rrhh.funcionesTrabajador.filter((f) => f.trabajadorId !== trabajadorId),
          ...funciones,
        ],
      },
      {
        title: "Funciones actualizadas",
        description: "Cambios aplicados al expediente del trabajador.",
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
            Plantilla ({rrhh.trabajadores.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Expediente, funciones y pagos de cada trabajador.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAdd(true)}
          disabled={sinCargos || saving}
        >
          <Plus className="size-4" />
          Añadir trabajador
        </Button>
      </div>

      {sinCargos && (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="size-4 shrink-0" />
          Primero crea al menos un cargo en el Clasificador de Cargos. Cada
          trabajador necesita un cargo asignado.
        </div>
      )}

      {trabajadoresOrdenados.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <Users className="mx-auto mb-2 size-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Aún no tienes trabajadores registrados
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Aquí podrás llevar el expediente de cada trabajador, sus funciones,
            la confección de nóminas y el registro de pagos.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setShowAdd(true)}
            disabled={sinCargos || saving}
          >
            <Plus className="size-4" />
            Añadir trabajador
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {trabajadoresOrdenados.map((trabajador) => (
            <TrabajadorCard
              key={trabajador.id}
              trabajador={trabajador}
              cargo={cargoDe(trabajador, rrhh.cargos)}
              saving={saving}
              onEditar={() => setEditando(trabajador)}
              onFunciones={() => setFuncionesAbiertas(trabajador)}
              onPagos={() => setPagosAbiertos(trabajador)}
              onEliminar={() => setAEliminar(trabajador)}
            />
          ))}
        </div>
      )}

      {(showAdd || editando) && (
        <TrabajadorFormDialog
          trabajador={editando}
          cargos={rrhh.cargos}
          saving={saving}
          onCancel={() => {
            setShowAdd(false);
            setEditando(null);
          }}
          onGuardar={(trabajador) => {
            guardarTrabajador(trabajador);
            setShowAdd(false);
            setEditando(null);
          }}
        />
      )}

      {aEliminar && (
        <Dialog open onOpenChange={() => setAEliminar(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar trabajador</DialogTitle>
              <DialogDescription>
                ¿Seguro que deseas eliminar a {nombreCompleto(aEliminar)}? Esta
                acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAEliminar(null)} disabled={saving}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() => {
                  eliminarTrabajador(aEliminar);
                  setAEliminar(null);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {funcionesAbiertas && (
        <FuncionesTrabajadorDialog
          trabajador={funcionesAbiertas}
          rrhh={rrhh}
          saving={saving}
          onClose={() => setFuncionesAbiertas(null)}
          onGuardar={(funciones) => {
            guardarFunciones(funcionesAbiertas.id, funciones);
            setFuncionesAbiertas(null);
          }}
        />
      )}

      {pagosAbiertos && (
        <PagosTrabajadorDialog
          trabajador={pagosAbiertos}
          rrhh={rrhh}
          saving={saving}
          onClose={() => setPagosAbiertos(null)}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function colorEstado(estado: EstadoTrabajador): string {
  switch (estado) {
    case "ACTIVO":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
    case "BAJA_TEMPORAL":
      return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
    case "BAJA_DEFINITIVA":
      return "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300";
  }
}

function TrabajadorCard({
  trabajador,
  cargo,
  saving,
  onEditar,
  onFunciones,
  onPagos,
  onEliminar,
}: {
  trabajador: Trabajador;
  cargo: Cargo | undefined;
  saving: boolean;
  onEditar: () => void;
  onFunciones: () => void;
  onPagos: () => void;
  onEliminar: () => void;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950 dark:text-slate-50">
            {nombreCompleto(trabajador) || "Sin nombre"}
          </p>
          <p
            className={`truncate text-xs ${
              cargo ? "text-slate-500 dark:text-slate-400" : "text-rose-600 dark:text-rose-400"
            }`}
          >
            {cargo?.nombre || "⚠ Cargo no encontrado"}
          </p>
        </div>
        <Badge className={`shrink-0 ${colorEstado(trabajador.estado)}`}>
          {ESTADO_LABELS[trabajador.estado]}
        </Badge>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>
          {cargo
            ? `${CATEGORIA_LABELS[cargo.categoriaOcupacional]} · Grupo ${aRomano(cargo.grupoEscala)}`
            : "—"}
        </span>
        <span className="font-semibold text-slate-900 dark:text-slate-100">
          {formatMoney(cargo?.salarioBase ?? 0)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        {trabajador.idTrabajador && (
          <Badge variant="outline">ID {trabajador.idTrabajador}</Badge>
        )}
        <Badge variant="outline" className="gap-1">
          <Banknote className="size-3" />
          {FORMAPAGO_LABELS[trabajador.formaPago]}
        </Badge>
        <Badge variant="outline" className="gap-1">
          <Clock className="size-3" />
          {MODOTRABAJO_LABELS[trabajador.modoTrabajo]}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
        <Button variant="ghost" size="sm" onClick={onFunciones} disabled={saving}>
          <CheckSquare className="size-4" />
          Funciones
        </Button>
        <Button variant="ghost" size="sm" onClick={onPagos} disabled={saving}>
          <Banknote className="size-4" />
          Pagos
        </Button>
        <Button variant="ghost" size="sm" onClick={onEditar} disabled={saving}>
          <Edit className="size-4" />
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
          onClick={onEliminar}
          disabled={saving}
        >
          <Trash2 className="size-4" />
          Eliminar
        </Button>
      </div>
    </Card>
  );
}

function TrabajadorFormDialog({
  trabajador,
  cargos,
  saving,
  onCancel,
  onGuardar,
}: {
  trabajador: Trabajador | null;
  cargos: Cargo[];
  saving: boolean;
  onCancel: () => void;
  onGuardar: (trabajador: Trabajador) => void;
}) {
  const [nombre, setNombre] = useState(trabajador?.nombre ?? "");
  const [apellidos, setApellidos] = useState(trabajador?.apellidos ?? "");
  const [ci, setCi] = useState(trabajador?.carnetIdentidad ?? "");
  const [idTrabajador, setIdTrabajador] = useState(trabajador?.idTrabajador ?? "");
  const [cargoId, setCargoId] = useState(
    trabajador?.cargoId &&
    cargos.some((c) => c.id === trabajador.cargoId)
      ? trabajador.cargoId
      : (cargos[0]?.id ?? ""),
  );
  const [tipoContrato, setTipoContrato] = useState<TipoContrato>(
    trabajador?.tipoContrato ?? "INDEFINIDO",
  );
  const [fechaIngreso, setFechaIngreso] = useState(
    aInputFecha(trabajador?.fechaIngreso ?? Date.now()),
  );
  const [vencimiento, setVencimiento] = useState(
    aInputFecha(trabajador?.fechaVencimientoContrato ?? null),
  );
  const [tarjeta, setTarjeta] = useState(trabajador?.tarjeta ?? "");
  const [lugarTrabajo, setLugarTrabajo] = useState(trabajador?.lugarTrabajo ?? "");
  const [horario, setHorario] = useState(trabajador?.horario ?? "");
  const [estado, setEstado] = useState<EstadoTrabajador>(
    trabajador?.estado ?? "ACTIVO",
  );
  const [formaPago, setFormaPago] = useState<FormaPago>(
    trabajador?.formaPago ?? "TARJETA",
  );
  const [modoTrabajo, setModoTrabajo] = useState<ModoTrabajo>(
    trabajador?.modoTrabajo ?? "TASA",
  );
  const [notas, setNotas] = useState(trabajador?.notas ?? "");

  const cargoSeleccionado = cargos.find((c) => c.id === cargoId);
  const valido =
    nombre.trim() !== "" &&
    apellidos.trim() !== "" &&
    ci.trim() !== "" &&
    cargoId !== "";

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{trabajador ? "Editar trabajador" : "Nuevo trabajador"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Apellidos</Label>
              <Input value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Carnet de identidad</Label>
              <Input value={ci} onChange={(e) => setCi(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Nº de expediente (ID en la prenómina)</Label>
              <Input value={idTrabajador} onChange={(e) => setIdTrabajador(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Fecha de ingreso</Label>
              <Input
                type="date"
                value={fechaIngreso}
                onChange={(e) => setFechaIngreso(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tarjeta (si cobra por tarjeta)</Label>
              <Input value={tarjeta} onChange={(e) => setTarjeta(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Cargo</Label>
            <Select value={cargoId} onValueChange={setCargoId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cargo" />
              </SelectTrigger>
              <SelectContent>
                {cargos.map((cargo) => (
                  <SelectItem key={cargo.id} value={cargo.id}>
                    {cargo.nombre} · {formatMoney(cargo.salarioBase)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {cargoSeleccionado && (
            <div className="rounded-md bg-slate-100 p-3 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
              Salario:{" "}
              <span className="font-semibold">{formatMoney(cargoSeleccionado.salarioBase)}</span>{" "}
              (definido en el Clasificador de Cargos)
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Tipo de contrato</Label>
              <Select
                value={tipoContrato}
                onValueChange={(v) => setTipoContrato(v as TipoContrato)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRATO_LABELS).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select
                value={estado}
                onValueChange={(v) => setEstado(v as EstadoTrabajador)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ESTADO_LABELS).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {tipoContrato !== "INDEFINIDO" && (
            <div className="grid gap-2">
              <Label>Vencimiento del contrato</Label>
              <Input
                type="date"
                value={vencimiento}
                onChange={(e) => setVencimiento(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Forma de pago</Label>
              <Select
                value={formaPago}
                onValueChange={(v) => setFormaPago(v as FormaPago)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMAPAGO_LABELS).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Cálculo del salario</Label>
              <Select
                value={modoTrabajo}
                onValueChange={(v) => setModoTrabajo(v as ModoTrabajo)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MODOTRABAJO_LABELS).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Lugar de trabajo</Label>
              <Input value={lugarTrabajo} onChange={(e) => setLugarTrabajo(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Horario (ej: L-V 8am-5pm)</Label>
              <Input value={horario} onChange={(e) => setHorario(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Notas</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
          </div>

          {!valido && (
            <p className="text-xs text-rose-600 dark:text-rose-400">
              Nombre, apellidos, carnet de identidad y cargo son obligatorios.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || saving}
            onClick={() => {
              const base: Trabajador =
                trabajador ??
                ({
                  id: nuevoId("trabajador"),
                  idTrabajador: "",
                  nombre: "",
                  apellidos: "",
                  carnetIdentidad: "",
                  tarjeta: "",
                  cargoId: "",
                  fechaIngreso: Date.now(),
                  tipoContrato: "INDEFINIDO",
                  fechaVencimientoContrato: null,
                  lugarTrabajo: "",
                  horario: "",
                  estado: "ACTIVO",
                  notas: "",
                  formaPago: "TARJETA",
                  modoTrabajo: "TASA",
                } satisfies Trabajador);
              onGuardar({
                ...base,
                idTrabajador: idTrabajador.trim(),
                nombre: nombre.trim(),
                apellidos: apellidos.trim(),
                carnetIdentidad: ci.trim(),
                tarjeta: tarjeta.trim(),
                cargoId,
                fechaIngreso: desdeInputFecha(fechaIngreso) ?? Date.now(),
                tipoContrato,
                fechaVencimientoContrato:
                  tipoContrato === "INDEFINIDO" ? null : desdeInputFecha(vencimiento),
                lugarTrabajo: lugarTrabajo.trim(),
                horario: horario.trim(),
                estado,
                formaPago,
                modoTrabajo,
                notas: notas.trim(),
              });
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FuncionesTrabajadorDialog({
  trabajador,
  rrhh,
  saving,
  onClose,
  onGuardar,
}: {
  trabajador: Trabajador;
  rrhh: RrhhBackupData;
  saving: boolean;
  onClose: () => void;
  onGuardar: (funciones: FuncionTrabajador[]) => void;
}) {
  const [funciones, setFunciones] = useState<FuncionTrabajador[]>(
    rrhh.funcionesTrabajador
      .filter((f) => f.trabajadorId === trabajador.id)
      .sort((a, b) => a.orden - b.orden),
  );

  const copiarPlantilla = () => {
    const cargo = cargoDe(trabajador, rrhh.cargos);
    if (!cargo) return;
    const plantilla = rrhh.funcionesCargo.filter(
      (f) => f.cargoId === cargo.id,
    );
    if (plantilla.length === 0) return;
    setFunciones(copiarFuncionesDeCargoATrabajador(rrhh, trabajador.id, cargo.id));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Funciones de {nombreCompleto(trabajador)}</DialogTitle>
          <DialogDescription>
            Funciones o atribuciones asignadas a este trabajador.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {funciones.map((funcion, index) => (
            <div
              key={funcion.id}
              className="flex items-center gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-800"
            >
              <Input
                value={funcion.descripcion}
                placeholder="Descripción de la función"
                onChange={(e) => {
                  const siguientes = [...funciones];
                  siguientes[index] = { ...funcion, descripcion: e.target.value };
                  setFunciones(siguientes);
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="Quitar función"
                onClick={() =>
                  setFunciones(funciones.filter((f) => f.id !== funcion.id))
                }
              >
                <Trash2 className="size-4 text-rose-600" />
              </Button>
            </div>
          ))}
          {funciones.length === 0 && (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Sin funciones asignadas.
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFunciones([
                ...funciones,
                {
                  id: nuevoId("fn"),
                  trabajadorId: trabajador.id,
                  descripcion: "",
                  orden: funciones.length,
                  asignadaPor: "",
                  origenFuncionCargoId: null,
                },
              ])
            }
          >
            <Plus className="size-4" />
            Añadir función
          </Button>
          <Button variant="outline" size="sm" onClick={copiarPlantilla} disabled={saving}>
            <BadgeInfo className="size-4" />
            Copiar del cargo
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={saving}
            onClick={() => {
              const ordenadas = funciones
                .filter((f) => f.descripcion.trim() !== "")
                .map((f, index) => ({ ...f, orden: index }));
              onGuardar(ordenadas);
            }}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const periodoClave = (mes: number, anio: number): string => `${anio}-${mes}`;

function PagosTrabajadorDialog({
  trabajador,
  rrhh,
  saving,
  onClose,
  onSave,
}: {
  trabajador: Trabajador;
  rrhh: RrhhBackupData;
  saving: boolean;
  onClose: () => void;
  onSave: RrhhTabProps["onSave"];
}) {
  const [formAbierto, setFormAbierto] = useState(false);
  const [pagoEnEdicion, setPagoEnEdicion] = useState<PagoNomina | null>(null);

  const pagos = useMemo(
    () =>
      rrhh.pagosNomina
        .filter((p) => p.trabajadorId === trabajador.id)
        .sort((a, b) => a.anio - b.anio || a.mes - b.mes),
    [rrhh.pagosNomina, trabajador.id],
  );

  const guardarPago = (pago: PagoNomina) => {
    const existe = rrhh.pagosNomina.some((p) => p.id === pago.id);
    onSave(
      {
        ...rrhh,
        pagosNomina: existe
          ? rrhh.pagosNomina.map((p) => (p.id === pago.id ? pago : p))
          : [...rrhh.pagosNomina, pago],
      },
      {
        title: "Pago guardado",
        description: `${MESES_CORTOS[pago.mes - 1]} ${pago.anio} · ${formatMoney(totalNeto(pago))}`,
      },
    );
  };

  const eliminarPago = (pago: PagoNomina) => {
    onSave(
      {
        ...rrhh,
        pagosNomina: rrhh.pagosNomina.filter((p) => p.id !== pago.id),
      },
      {
        title: "Pago eliminado",
        description: `${MESES_CORTOS[pago.mes - 1]} ${pago.anio} de ${nombreCompleto(trabajador)}`,
      },
    );
  };

  const marcarPagado = (pago: PagoNomina) => {
    guardarPago({ ...pago, fechaPago: pago.fechaPago ?? Date.now() });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pagos de {nombreCompleto(trabajador)}</DialogTitle>
          <DialogDescription>
            Confección de nóminas y registro de pagos por periodo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <Badge variant="outline">{pagos.length} pago(s)</Badge>
          <Button size="sm" onClick={() => setFormAbierto(true)} disabled={saving}>
            <Plus className="size-4" />
            Confeccionar pago
          </Button>
        </div>

        {pagos.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sin pagos registrados para este trabajador.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-130 text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  <th className="py-2 pr-3">Periodo</th>
                  <th className="py-2 pr-3 text-right">Salario</th>
                  <th className="py-2 pr-3 text-right">Adicionales</th>
                  <th className="py-2 pr-3 text-right">Descuentos</th>
                  <th className="py-2 pr-3 text-right">Neto</th>
                  <th className="py-2">Estado</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {pagos.map((pago) => (
                  <tr
                    key={pago.id}
                    className="border-b border-slate-100 dark:border-slate-800/80"
                  >
                    <td className="py-2 pr-3 font-medium text-slate-950 dark:text-slate-50">
                      {MESES_CORTOS[pago.mes - 1]} {pago.anio}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-300">
                      {formatMoney(pago.salarioBase)}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-300">
                      {formatMoney(pago.pagosAdicionales)}
                    </td>
                    <td className="py-2 pr-3 text-right text-slate-600 dark:text-slate-300">
                      {formatMoney(totalDescuentos(pago))}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                      {formatMoney(totalNeto(pago))}
                    </td>
                    <td className="py-2">
                      {pagoPagado(pago) ? (
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                          Pagado {formatFecha(pago.fechaPago)}
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!pagoPagado(pago) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => marcarPagado(pago)}
                            disabled={saving}
                          >
                            Marcar pagado
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPagoEnEdicion(pago)}
                          disabled={saving}
                        >
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label="Eliminar pago"
                          onClick={() => eliminarPago(pago)}
                          disabled={saving}
                        >
                          <Trash2 className="size-4 text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(formAbierto || pagoEnEdicion) && (
          <PagoFormDialog
            trabajador={trabajador}
            rrhh={rrhh}
            pago={pagoEnEdicion}
            saving={saving}
            onCancel={() => {
              setFormAbierto(false);
              setPagoEnEdicion(null);
            }}
            onGuardar={(pago) => {
              guardarPago(pago);
              setFormAbierto(false);
              setPagoEnEdicion(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PagoFormDialog({
  trabajador,
  rrhh,
  pago,
  saving,
  onCancel,
  onGuardar,
}: {
  trabajador: Trabajador;
  rrhh: RrhhBackupData;
  pago: PagoNomina | null;
  saving: boolean;
  onCancel: () => void;
  onGuardar: (pago: PagoNomina) => void;
}) {
  const [periodo, setPeriodo] = useState(
    pago ? `${pago.anio}-${pago.mes}` : String(periodoClave(new Date().getMonth() + 1, new Date().getFullYear())),
  );
  const [salarioBase, setSalarioBase] = useState(
    pago
      ? String(pago.salarioBase)
      : String(salarioActualDe(trabajador, rrhh.cargos)),
  );
  const [adicionales, setAdicionales] = useState(String(pago?.pagosAdicionales ?? 0));
  const [descuentos, setDescuentos] = useState<DescuentoAplicado[]>(
    pago?.descuentos ??
      sugerirDescuentos(salarioActualDe(trabajador, rrhh.cargos), rrhh.conceptosDescuento),
  );
  const [notas, setNotas] = useState(pago?.notas ?? "");

  const yaExistePago = (mes: number, anio: number): boolean =>
    rrhh.pagosNomina.some(
      (p) =>
        p.trabajadorId === trabajador.id &&
        p.anio === anio &&
        p.mes === mes &&
        p.id !== pago?.id,
    );

  const [selAnioStr, selMesStr] = periodo.split("-");
  const mesSel = Number(selMesStr);
  const anioSel = Number(selAnioStr);
  const salarioNum = Number(salarioBase) || 0;
  const adicionalesNum = Number(adicionales) || 0;
  const descuentosNum = descuentos.reduce((acc, d) => acc + (Number(d.monto) || 0), 0);
  const neto = salarioNum + adicionalesNum - descuentosNum;
  const valido = Number.isFinite(salarioNum) && !yaExistePago(mesSel, anioSel);

  return (
    <div className="mt-4 rounded-md border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
        {pago ? "Editar pago" : "Nuevo pago"}
      </p>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Periodo</Label>
          <Select
            value={periodo}
            onValueChange={(v) => {
              const [a, m] = v.split("-").map(Number);
              setPeriodo(periodoClave(m, a));
            }}
            disabled={Boolean(pago)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ultimosPeriodos(24).map(({ mes, anio }) => (
                <SelectItem key={periodoClave(mes, anio)} value={periodoClave(mes, anio)}>
                  {MESES_CORTOS[mes - 1]} {anio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Salario base (CUP)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={salarioBase}
            onChange={(e) => setSalarioBase(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label>Pagos adicionales (CUP)</Label>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={adicionales}
            onChange={(e) => setAdicionales(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <div className="flex items-center justify-between">
          <Label>Descuentos</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setDescuentos([
                ...descuentos,
                { conceptoId: nuevoId("desc"), nombre: "", monto: 0, esManual: true },
              ])
            }
          >
            <Plus className="size-4" />
            Añadir descuento
          </Button>
        </div>
        {descuentos.length === 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Sin descuentos aplicados.
          </p>
        )}
        {descuentos.map((descuento, index) => (
          <div
            key={descuento.conceptoId ?? index}
            className="grid gap-2 sm:grid-cols-[1fr_8rem_2.5rem]"
          >
            <Input
              placeholder="Nombre del descuento"
              value={descuento.nombre}
              onChange={(e) => {
                const siguientes = [...descuentos];
                siguientes[index] = {
                  ...descuento,
                  nombre: e.target.value,
                  esManual: true,
                };
                setDescuentos(siguientes);
              }}
            />
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              placeholder="0.00"
              value={String(descuento.monto)}
              onChange={(e) => {
                const siguientes = [...descuentos];
                siguientes[index] = {
                  ...descuento,
                  monto: Number(e.target.value) || 0,
                  esManual: true,
                };
                setDescuentos(siguientes);
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Quitar descuento"
              onClick={() => setDescuentos(descuentos.filter((_, i) => i !== index))}
            >
              <Trash2 className="size-4 text-rose-600" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        <Label>Notas</Label>
        <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-slate-500 dark:text-slate-400">
          Bruto: <strong>{formatMoney(salarioNum + adicionalesNum)}</strong> · Neto a
          pagar: <strong>{formatMoney(neto)}</strong>
        </span>
        {yaExistePago(mesSel, anioSel) && (
          <span className="text-xs text-rose-600 dark:text-rose-400">
            Ya existe un pago para este periodo.
          </span>
        )}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button
          disabled={!valido || saving}
          onClick={() => {
            const base: PagoNomina =
              pago ??
              ({
                id: nuevoId("pago"),
                trabajadorId: trabajador.id,
                mes: mesSel,
                anio: anioSel,
                salarioBase: 0,
                pagosAdicionales: 0,
                descuentos: [],
                fechaPago: null,
                metodoPago: "",
                notas: "",
                diasTrabajados: 0,
                diasPeriodo: 0,
                monedaPago: null,
                montoPagado: null,
                movimientoCajaId: null,
              } satisfies PagoNomina);
            onGuardar({
              ...base,
              salarioBase: salarioNum,
              pagosAdicionales: adicionalesNum,
              descuentos: descuentos
                .filter((d) => d.nombre.trim() !== "")
                .map((d) => ({ ...d, monto: Number(d.monto) || 0 })),
              notas: notas.trim(),
            });
          }}
        >
          Guardar pago
        </Button>
      </div>
    </div>
  );
}