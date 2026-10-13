import { Briefcase, Edit, Plus, Shield, Trash2 } from "lucide-react";
import { useState } from "react";
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
  CategoriaOcupacional,
  FuncionCargo,
  RrhhBackupData,
} from "../../accounting/core/types/accountingTypes";
import {
  CATEGORIA_GRUPOS,
  CATEGORIA_LABELS,
  aRomano,
  formatMoney,
  nuevoId,
} from "./helpers";
import type { RrhhTabProps } from "./props";

export function CargosTab({ rrhh, saving, onSave }: RrhhTabProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [editando, setEditando] = useState<Cargo | null>(null);
  const [aEliminar, setAEliminar] = useState<Cargo | null>(null);
  const [funcionesCargo, setFuncionesCargo] = useState<Cargo | null>(null);

  const cargosOrdenados = [...rrhh.cargos].sort((a, b) =>
    a.nombre.localeCompare(b.nombre),
  );

  const guardarCargo = (cargo: Cargo) => {
    const existe = rrhh.cargos.some((c) => c.id === cargo.id);
    onSave(
      {
        ...rrhh,
        cargos: existe
          ? rrhh.cargos.map((c) => (c.id === cargo.id ? cargo : c))
          : [...rrhh.cargos, cargo],
      },
      {
        title: "Cargo guardado",
        description: cargo.nombre,
      },
    );
  };

  const eliminarCargo = (cargo: Cargo) => {
    onSave(
      {
        ...rrhh,
        cargos: rrhh.cargos.filter((c) => c.id !== cargo.id),
        funcionesCargo: rrhh.funcionesCargo.filter((f) => f.cargoId !== cargo.id),
      },
      {
        title: "Cargo eliminado",
        description: cargo.nombre,
      },
    );
  };

  const guardarFunciones = (cargoId: string, funciones: FuncionCargo[]) => {
    onSave(
      {
        ...rrhh,
        funcionesCargo: [
          ...rrhh.funcionesCargo.filter((f) => f.cargoId !== cargoId),
          ...funciones,
        ],
      },
      {
        title: "Funciones actualizadas",
        description: "Plantilla del cargo actualizada.",
      },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-950 dark:text-slate-50">
            Catálogo de cargos ({rrhh.cargos.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clasificador de Cargos · Categoría, grupo de escala y salario escalafonado.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)} disabled={saving}>
          <Plus className="size-4" />
          Nuevo cargo
        </Button>
      </div>

      {cargosOrdenados.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <Briefcase className="mx-auto mb-2 size-8 text-slate-400" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Aún no tienes cargos registrados
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Define aquí los cargos con su categoría, grupo de escala y salario
            base. Luego se asignan a los trabajadores.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setShowAdd(true)}
            disabled={saving}
          >
            <Plus className="size-4" />
            Nuevo cargo
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cargosOrdenados.map((cargo) => (
            <Card key={cargo.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950 dark:text-slate-50">
                    {cargo.nombre}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {CATEGORIA_LABELS[cargo.categoriaOcupacional]
                      ? `${CATEGORIA_LABELS[cargo.categoriaOcupacional]} · Escala IV`
                      : "Categoría no definida"}
                  </p>
                </div>
                <span className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatMoney(cargo.salarioBase)}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Grupo {aRomano(cargo.grupoEscala)}</Badge>
                <Badge variant="outline">
                  CO · {cargo.categoriaOcupacional.slice(0, 1)}
                </Badge>
                <Badge variant="outline">
                  {rrhh.funcionesCargo.filter((f) => f.cargoId === cargo.id).length}{" "}
                  función(es)
                </Badge>
              </div>

              {cargo.descripcion && (
                <p className="mt-3 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
                  {cargo.descripcion}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFuncionesCargo(cargo)}
                  disabled={saving}
                >
                  <Shield className="size-4" />
                  Funciones
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditando(cargo)}
                  disabled={saving}
                >
                  <Edit className="size-4" />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-600 hover:text-rose-700 dark:text-rose-400"
                  onClick={() => setAEliminar(cargo)}
                  disabled={saving}
                >
                  <Trash2 className="size-4" />
                  Eliminar
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(showAdd || editando) && (
        <CargoFormDialog
          cargo={editando}
          saving={saving}
          onCancel={() => {
            setShowAdd(false);
            setEditando(null);
          }}
          onGuardar={(cargo) => {
            guardarCargo(cargo);
            setShowAdd(false);
            setEditando(null);
          }}
        />
      )}

      {aEliminar && (
        <Dialog open onOpenChange={() => setAEliminar(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Eliminar cargo</DialogTitle>
              <DialogDescription>
                ¿Seguro que deseas eliminar{" "}
                <span className="font-medium">{aEliminar.nombre}</span>? También
                se eliminarán sus funciones de plantilla.
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
                  eliminarCargo(aEliminar);
                  setAEliminar(null);
                }}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {funcionesCargo && (
        <FuncionesCargoDialog
          cargo={funcionesCargo}
          rrhh={rrhh}
          saving={saving}
          onClose={() => setFuncionesCargo(null)}
          onGuardar={(funciones) => {
            guardarFunciones(funcionesCargo.id, funciones);
            setFuncionesCargo(null);
          }}
        />
      )}
    </div>
  );
}

function CargoFormDialog({
  cargo,
  saving,
  onCancel,
  onGuardar,
}: {
  cargo: Cargo | null;
  saving: boolean;
  onCancel: () => void;
  onGuardar: (cargo: Cargo) => void;
}) {
  const [nombre, setNombre] = useState(cargo?.nombre ?? "");
  const [categoria, setCategoria] = useState<CategoriaOcupacional>(
    cargo?.categoriaOcupacional ?? "OPERARIO",
  );
  const [grupo, setGrupo] = useState(
    cargo?.grupoEscala ?? CATEGORIA_GRUPOS[cargo?.categoriaOcupacional ?? "OPERARIO"].min,
  );
  const [salario, setSalario] = useState(cargo ? String(cargo.salarioBase) : "");
  const [descripcion, setDescripcion] = useState(cargo?.descripcion ?? "");

  const rango = CATEGORIA_GRUPOS[categoria];
  const grupoInvalido =
    grupo < rango.min || grupo > rango.max
      ? `El grupo debe estar entre ${aRomano(rango.min)} y ${aRomano(rango.max)} para esta categoría.`
      : null;
  const valido = nombre.trim() !== "" && salario !== "" && !grupoInvalido;

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cargo ? "Editar cargo" : "Nuevo cargo"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Denominación del cargo</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2 sm:col-span-1">
              <Label>Categoría ocupacional</Label>
              <Select
                value={categoria}
                onValueChange={(v) => {
                  const nueva = v as CategoriaOcupacional;
                  setCategoria(nueva);
                  setGrupo(CATEGORIA_GRUPOS[nueva].min);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORIA_LABELS).map(([valor, label]) => (
                    <SelectItem key={valor} value={valor}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Grupo de escala</Label>
              <Select
                value={String(grupo)}
                onValueChange={(v) => setGrupo(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(
                    { length: rango.max - rango.min + 1 },
                    (_, i) => rango.min + i,
                  ).map((g) => (
                    <SelectItem key={g} value={String(g)}>
                      {aRomano(g)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {grupoInvalido !== null && (
                <p className="text-xs text-rose-600 dark:text-rose-400">
                  {grupoInvalido}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Salario base (CUP)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.01"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
                placeholder="Ej: 2625.00"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Descripción</Label>
            <Textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button
            disabled={!valido || saving}
            onClick={() => {
              const base: Cargo =
                cargo ??
                ({
                  id: nuevoId("cargo"),
                  nombre: "",
                  categoriaOcupacional: "OPERARIO",
                  grupoEscala: CATEGORIA_GRUPOS.OPERARIO.min,
                  salarioBase: 0,
                  descripcion: "",
                } satisfies Cargo);
              onGuardar({
                ...base,
                nombre: nombre.trim(),
                categoriaOcupacional: categoria,
                grupoEscala: grupo,
                salarioBase: Number(salario) || 0,
                descripcion: descripcion.trim(),
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

function FuncionesCargoDialog({
  cargo,
  rrhh,
  saving,
  onClose,
  onGuardar,
}: {
  cargo: Cargo;
  rrhh: RrhhBackupData;
  saving: boolean;
  onClose: () => void;
  onGuardar: (funciones: FuncionCargo[]) => void;
}) {
  const [funciones, setFunciones] = useState<FuncionCargo[]>(
    rrhh.funcionesCargo
      .filter((f) => f.cargoId === cargo.id)
      .sort((a, b) => a.orden - b.orden),
  );

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Funciones del cargo</DialogTitle>
          <DialogDescription>
            {cargo.nombre} — características o funciones principales de la
            plantilla de este cargo.
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
              Sin funciones definidas para este cargo.
            </p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setFunciones([
              ...funciones,
              { id: nuevoId("fnc"), cargoId: cargo.id, descripcion: "", orden: funciones.length },
            ])
          }
        >
          <Plus className="size-4" />
          Añadir función
        </Button>

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