import { Component, inject, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { HttpServices } from '../../../../core/services/http/http.service';

interface PlatilloData {
  id?: string;
  nombre: string;
  descripcion: string;
  calorias: number | string;
  tiempo_preparacion: number | string;
  imagen_url: string;
  es_publico: number | string;
  creador_id?: string;
  creador_nombre?: string;
  tipos_dieta?: string;
  tipos_comida?: string;
  tipos_objetivo?: string;
  ingredientes?: Ingrediente[];
  configuraciones?: Configuracion[];
}

interface Ingrediente {
  alimento_id: number;
  cantidad: number;
  unidad_medida: string;
  nombre_alimento?: string;
}

interface Configuracion {
  tipo_dieta_id: number;
  tipo_comida_id: number;
  tipo_objetivo_id: number;
  nombre_dieta?: string;
  nombre_comida?: string;
  nombre_objetivo?: string;
}

interface Alimento {
  id: number;
  nombre: string;
  categoria?: string;
}

interface TipoDieta {
  id: number;
  nombre: string;
}

interface TipoComida {
  id: number;
  nombre: string;
}

interface TipoObjetivo {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-alta-platillos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './alta-platillos.html',
  styleUrl: './alta-platillos.scss'
})
export class AltaPlatillos implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private http = inject(HttpServices);
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  public activeModal = inject(NgbActiveModal);

  @Input() platilloData: PlatilloData | null = null;
  @Input() isEdit: boolean = false;

  loading = false;
  errorMsg: string | null = null;
  platilloForm: FormGroup;
  isFormReady = false;

  // Catálogos
  alimentos: Alimento[] = [];
  tiposDieta: TipoDieta[] = [];
  tiposComida: TipoComida[] = [];
  tiposObjetivo: TipoObjetivo[] = [];
  loadingCatalogos = false;

  // Unidades de medida disponibles
  unidadesMedida = [
    'g', 'kg', 'ml', 'l', 'pza', 'taza', 'cdita', 'cda', 'onza', 'lb'
  ];

  // Variables para la búsqueda de alimentos
  alimentoSearchTerms: string[] = [];
  alimentoDropdownVisible: boolean[] = [];
  filteredAlimentos: Alimento[][] = [];
  alimentoNotFound: boolean[] = []; // Nuevo: array para controlar si no se encuentra el alimento
  alimentoSelected: boolean[] = []; // Nuevo: array para controlar si se ha seleccionado un alimento

  constructor() {
    this.platilloForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      calorias: [0, [Validators.required, Validators.min(1)]],
      tiempo_preparacion: [0, [Validators.required, Validators.min(1)]],
      imagen_url: [''],
      es_publico: [1, Validators.required],
      ingredientes: this.fb.array([]),
      configuraciones: this.fb.array([])
    });
  }

  ngOnInit(): void {
    console.log('ngOnInit - Inicializando componente');

    // Cargar catálogos primero
    this.cargarCatalogos();

    // Inicializar arrays de búsqueda
    this.alimentoSearchTerms = [];
    this.alimentoDropdownVisible = [];
    this.filteredAlimentos = [];
    this.alimentoNotFound = [];
    this.alimentoSelected = [];

    // Inicializar arrays del formulario si están vacíos
    if (this.ingredientesArray.length === 0) {
      this.agregarIngrediente();
    }

    // Solo permitir una configuración
    if (this.configuracionesArray.length === 0) {
      this.agregarConfiguracion();
    }

    // Marcar formulario como listo
    this.isFormReady = true;
    this.cdr.markForCheck();

    // Si es edición, cargar datos después de que todo esté listo
    if (this.isEdit && this.platilloData) {
      setTimeout(() => {
        this.cargarDatosPlatillo();
      }, 1000);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private cargarCatalogos(): void {
    this.loadingCatalogos = true;

    forkJoin({
      alimentos: this.http.obtenerAlimentos(),
      tiposDieta: this.http.obtenerTiposDieta(),
      tiposComida: this.http.obtenerTiposComida(),
      tiposObjetivo: this.http.obtenerTiposObjetivos()
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resp: any) => {
          if (resp.alimentos?.status === 'success') {
            this.alimentos = resp.alimentos.data || [];
          }
          if (resp.tiposDieta?.status === 'success') {
            this.tiposDieta = resp.tiposDieta.data || [];
          }
          if (resp.tiposComida?.status === 'success') {
            this.tiposComida = resp.tiposComida.data || [];
          }
          if (resp.tiposObjetivo?.status === 'success') {
            this.tiposObjetivo = resp.tiposObjetivo.data || [];
          }

          this.loadingCatalogos = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.loadingCatalogos = false;
          this.errorMsg = 'Error al cargar catálogos';
          this.cdr.markForCheck();
        }
      });
  }

  private cargarDatosPlatillo(): void {
    if (!this.platilloData) return;

    // Si tenemos un ID, obtener los detalles completos del platillo
    if (this.platilloData.id && !this.platilloData.ingredientes) {
      this.http.obtenerPlatilloById(Number(this.platilloData.id))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response?.status === 'success' && response.data) {
              this.cargarDatosFormulario(response.data);
            } else {
              // Si no hay detalles, usar los datos básicos
              this.cargarDatosFormulario(this.platilloData!);
            }
          },
          error: () => {
            // En caso de error, usar los datos básicos
            this.cargarDatosFormulario(this.platilloData!);
          }
        });
    } else {
      this.cargarDatosFormulario(this.platilloData);
    }
  }

  private cargarDatosFormulario(platilloData: PlatilloData): void {
    // Cargar datos básicos del formulario
    const platilloFormData: any = {};
    Object.keys(this.platilloForm.controls).forEach(key => {
      if (key !== 'ingredientes' && key !== 'configuraciones') {
        let valor = platilloData[key as keyof PlatilloData] || '';

        // Convertir a números cuando sea necesario
        if (key === 'calorias' || key === 'tiempo_preparacion') {
          valor = Number(valor) || 0;
        }
        if (key === 'es_publico') {
          valor = Number(valor) || 1;
        }

        platilloFormData[key] = valor;
      }
    });

    this.platilloForm.patchValue(platilloFormData);

    // Limpiar arrays existentes de forma segura
    this.limpiarFormArrays();

    // Cargar ingredientes
    if (platilloData.ingredientes && platilloData.ingredientes.length > 0) {
      platilloData.ingredientes.forEach(ingrediente => {
        this.agregarIngrediente(ingrediente);
      });
    } else {
      // Si no hay ingredientes, agregar uno vacío
      this.agregarIngrediente();
    }

    // Cargar configuraciones
    if (platilloData.configuraciones && platilloData.configuraciones.length > 0) {
      platilloData.configuraciones.forEach(config => {
        this.agregarConfiguracion(config);
      });
    } else {
      // Si no hay configuraciones, agregar una vacía
      this.agregarConfiguracion();
    }

    // Forzar detección de cambios
    this.cdr.detectChanges();
  }

  private limpiarFormArrays(): void {
    // Limpiar ingredientes
    while (this.ingredientesArray.length !== 0) {
      this.ingredientesArray.removeAt(0);
    }

    // Limpiar configuraciones
    while (this.configuracionesArray.length !== 0) {
      this.configuracionesArray.removeAt(0);
    }
  }

  // Métodos de búsqueda de alimentos
  onAlimentoSearch(event: any, index: number): void {
    const term = event.target.value.toLowerCase();
    this.alimentoSearchTerms[index] = event.target.value;
    
    // Resetear estado de selección cuando el usuario está escribiendo
    this.alimentoSelected[index] = false;
    this.ingredientesArray.at(index).get('alimento_id')?.setValue('');
    
    if (term.length >= 2) {
      this.filteredAlimentos[index] = this.alimentos.filter(alimento =>
        alimento.nombre.toLowerCase().includes(term)
      );
      
      // Verificar si no se encontraron resultados
      this.alimentoNotFound[index] = this.filteredAlimentos[index].length === 0;
      this.alimentoDropdownVisible[index] = true;
    } else {
      this.filteredAlimentos[index] = [...this.alimentos];
      this.alimentoDropdownVisible[index] = false;
      this.alimentoNotFound[index] = false;
    }
    
    this.cdr.markForCheck();
  }

  showAlimentoDropdown(index: number): void {
    this.alimentoDropdownVisible[index] = true;
    if (!this.filteredAlimentos[index] || this.filteredAlimentos[index].length === 0) {
      this.filteredAlimentos[index] = [...this.alimentos];
    }
  }

  selectAlimento(alimento: Alimento, index: number): void {
    this.ingredientesArray.at(index).get('alimento_id')?.setValue(alimento.id);
    this.alimentoSearchTerms[index] = alimento.nombre;
    this.alimentoDropdownVisible[index] = false;
    this.alimentoNotFound[index] = false;
    this.alimentoSelected[index] = true;
    this.cdr.markForCheck();
  }

  getAlimentoSearch(index: number): string {
    return this.alimentoSearchTerms[index] || '';
  }

  getFilteredAlimentos(index: number): Alimento[] {
    return this.filteredAlimentos[index] || [];
  }

  // Nuevo método para verificar si no se encontró el alimento
  isAlimentoNotFound(index: number): boolean {
    return this.alimentoNotFound[index] || false;
  }

  // Nuevo método para verificar si se ha seleccionado un alimento
  isAlimentoSelected(index: number): boolean {
    return this.alimentoSelected[index] || false;
  }

  // Nuevo método para verificar si el campo de búsqueda está vacío pero es requerido
  isAlimentoSearchEmpty(index: number): boolean {
    const searchTerm = this.alimentoSearchTerms[index] || '';
    const isSelected = this.isAlimentoSelected(index);
    return searchTerm.length === 0 && !isSelected;
  }

  // Nuevo método para obtener el mensaje de error específico del alimento
  getAlimentoErrorMessage(index: number): string {
    if (this.isAlimentoSearchEmpty(index)) {
      return 'Debes seleccionar un alimento';
    }
    if (this.isAlimentoNotFound(index)) {
      return 'No se encontró ningún alimento con ese nombre';
    }
    if (!this.isAlimentoSelected(index) && this.alimentoSearchTerms[index]) {
      return 'Debes seleccionar un alimento de la lista';
    }
    return 'Alimento es requerido';
  }

  // Método para manejar el cambio de visibilidad
  onVisibilidadChange(event: any): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.platilloForm.get('es_publico')?.setValue(isChecked ? '1' : '0');
  }

  // Ocultar todos los dropdowns
  hideAllDropdowns(event?: any): void {
    // Solo cerrar si el click no es en un input de búsqueda o dropdown
    if (event && (event.target.closest('.alimento-dropdown') || event.target.closest('input[placeholder="Buscar alimento..."]'))) {
      return;
    }
    
    this.alimentoDropdownVisible.fill(false);
    
    // Marcar campos como touched si el usuario hizo click fuera sin seleccionar
    this.ingredientesArray.controls.forEach((control, index) => {
      const searchTerm = this.alimentoSearchTerms[index];
      const isSelected = this.alimentoSelected[index];
      
      if (searchTerm && !isSelected) {
        control.get('alimento_id')?.markAsTouched();
      }
    });
  }

  // Calcular progreso del formulario
  getFormProgress(): number {
    let progress = 0;
    const totalFields = 7; // Total de campos principales
    
    // Información básica (4 campos obligatorios)
    if (this.platilloForm.get('nombre')?.value) progress++;
    if (this.platilloForm.get('descripcion')?.value) progress++;
    if (this.platilloForm.get('calorias')?.value > 0) progress++;
    if (this.platilloForm.get('tiempo_preparacion')?.value > 0) progress++;
    
    // Visibilidad
    if (this.platilloForm.get('es_publico')?.value !== null) progress++;
    
    // Ingredientes (al menos 1)
    if (this.ingredientesArray.length > 0) {
      const validIngredients = this.ingredientesArray.controls.filter(ing => 
        ing.get('alimento_id')?.value && ing.get('cantidad')?.value > 0
      );
      if (validIngredients.length > 0) progress++;
    }
    
    // Configuración nutricional
    if (this.configuracionesArray.length > 0) {
      const config = this.configuracionesArray.at(0);
      if (config.get('tipo_dieta_id')?.value && 
          config.get('tipo_comida_id')?.value && 
          config.get('tipo_objetivo_id')?.value) {
        progress++;
      }
    }
    
    return Math.round((progress / totalFields) * 100);
  }

  // También actualiza el método onSubmit para mejor debugging:
  onSubmit(): void {
    console.log('Enviando formulario...');
    console.log('Form valid:', this.platilloForm.valid);
    console.log('Form value:', this.platilloForm.value);

    if (this.platilloForm.invalid) {
      console.log('Formulario inválido:', this.platilloForm.errors);
      this.markFormGroupTouched();
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    // Procesar y validar los datos del formulario
    const rawFormData = this.platilloForm.value;

    console.log('Raw form data:', rawFormData);

    // Validar que hay al menos un ingrediente válido
    const ingredientesValidos = rawFormData.ingredientes?.filter((ing: any, index: number) => {
      const isAlimentoSelected = this.isAlimentoSelected(index);
      const alimentoId = ing.alimento_id;
      const cantidad = ing.cantidad;
      const unidadMedida = ing.unidad_medida;
      
      return alimentoId && cantidad && cantidad > 0 && unidadMedida && isAlimentoSelected;
    }) || [];

    console.log('Ingredientes válidos:', ingredientesValidos);

    if (ingredientesValidos.length === 0) {
      this.loading = false;
      
      // Marcar todos los campos de alimento como touched para mostrar errores
      this.ingredientesArray.controls.forEach((control, index) => {
        control.get('alimento_id')?.markAsTouched();
        if (!this.isAlimentoSelected(index)) {
          this.alimentoNotFound[index] = this.alimentoSearchTerms[index] ? true : false;
        }
      });
      
      Swal.fire({
        icon: 'warning',
        title: 'Ingredientes requeridos',
        text: 'Debes agregar al menos un ingrediente válido. Asegúrate de seleccionar alimentos de la lista.',
        confirmButtonColor: 'var(--primary-color)'
      });
      return;
    }

    if (ingredientesValidos.length > 15) {
      this.loading = false;
      Swal.fire({
        icon: 'warning',
        title: 'Límite de ingredientes excedido',
        text: 'No se pueden agregar más de 15 ingredientes por platillo'
      });
      return;
    }

    // Validar que hay al menos una configuración válida
    const configuracionesValidas = rawFormData.configuraciones?.filter((config: any) =>
      config.tipo_dieta_id && config.tipo_comida_id && config.tipo_objetivo_id
    ) || [];

    console.log('Configuraciones válidas:', configuracionesValidas);

    if (configuracionesValidas.length === 0) {
      this.loading = false;
      Swal.fire({
        icon: 'warning',
        title: 'Configuraciones requeridas',
        text: 'Debes agregar al menos una configuración nutricional válida'
      });
      return;
    }

    // Formatear los datos para la API
    const formData = {
      nombre: rawFormData.nombre?.trim(),
      descripcion: rawFormData.descripcion?.trim(),
      calorias: Number(rawFormData.calorias) || 0,
      tiempo_preparacion: Number(rawFormData.tiempo_preparacion) || 0,
      imagen_url: rawFormData.imagen_url?.trim() || '',
      es_publico: Number(rawFormData.es_publico) || 0,
      ingredientes: ingredientesValidos.map((ing: any) => ({
        alimento_id: Number(ing.alimento_id),
        cantidad: Number(ing.cantidad),
        unidad_medida: ing.unidad_medida
      })),
      configuraciones: configuracionesValidas.map((config: any) => ({
        tipo_dieta_id: Number(config.tipo_dieta_id),
        tipo_comida_id: Number(config.tipo_comida_id),
        tipo_objetivo_id: Number(config.tipo_objetivo_id)
      }))
    };

    console.log('Datos finales a enviar:', formData);

    const action = this.isEdit ? 'actualizar' : 'crear';

    Swal.fire({
      title: this.isEdit ? 'Actualizando platillo...' : 'Creando platillo...',
      text: 'Por favor espera',
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const serviceCall = this.isEdit && this.platilloData?.id
      ? this.http.actualizarPlatillo({ ...formData, id: this.platilloData.id })
      : this.http.crearPlatillo(formData);

    serviceCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Respuesta del servidor:', response);
          this.loading = false;
          Swal.close();

          if (response?.status === 'success') {
            Swal.fire({
              icon: 'success',
              title: this.isEdit ? 'Platillo Actualizado' : 'Platillo Creado',
              text: response.message || `El platillo se ha ${action} correctamente`,
              timer: 3000,
              showConfirmButton: false
            });

            this.activeModal.close(this.isEdit ? 'updated' : 'created');
          } else {
            this.errorMsg = response?.message || `Error al ${action} el platillo`;
            this.cdr.markForCheck();
          }
        },
        error: (error) => {
          console.error('Error al enviar:', error);
          this.loading = false;
          Swal.close();

          this.errorMsg = error?.error?.message || `Error al ${action} el platillo`;
          this.cdr.markForCheck();

          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: this.errorMsg || 'Error desconocido'
          });
        }
      });
  }
  // Getter para arrays de formulario
  get ingredientesArray(): FormArray {
    const array = this.platilloForm.get('ingredientes') as FormArray;
    console.log('Ingredientes array getter:', array ? array.length : 'null');
    return array;
  }

  get configuracionesArray(): FormArray {
    const array = this.platilloForm.get('configuraciones') as FormArray;
    console.log('Configuraciones array getter:', array ? array.length : 'null');
    return array;
  }

  // Métodos para ingredientes
  agregarIngrediente(ingrediente?: Ingrediente): void {
    console.log('Agregando ingrediente:', ingrediente);

    // Validar límite máximo de ingredientes
    if (this.ingredientesArray.length >= 15) {
      return;
    }

    const ingredienteForm = this.fb.group({
      alimento_id: [ingrediente?.alimento_id || '', Validators.required],
      cantidad: [ingrediente?.cantidad || '', [Validators.required, Validators.min(0.1)]],
      unidad_medida: [ingrediente?.unidad_medida || 'g', Validators.required]
    });

    this.ingredientesArray.push(ingredienteForm);
    
    // Inicializar arrays de búsqueda para el nuevo ingrediente
    const index = this.ingredientesArray.length - 1;
    this.alimentoSearchTerms[index] = '';
    this.alimentoDropdownVisible[index] = false;
    this.filteredAlimentos[index] = [...this.alimentos];
    this.alimentoNotFound[index] = false;
    this.alimentoSelected[index] = false;

    // Si es un ingrediente existente, configurar el estado apropiado
    if (ingrediente?.alimento_id) {
      const alimento = this.alimentos.find(a => a.id === ingrediente.alimento_id);
      if (alimento) {
        this.alimentoSearchTerms[index] = alimento.nombre;
        this.alimentoSelected[index] = true;
      }
    }

    console.log('Ingredientes array length:', this.ingredientesArray.length);
    this.cdr.markForCheck();
  }

  eliminarIngrediente(index: number): void {
    if (this.ingredientesArray.length > 1) {
      this.ingredientesArray.removeAt(index);
      
      // Remover elementos correspondientes de los arrays de búsqueda
      this.alimentoSearchTerms.splice(index, 1);
      this.alimentoDropdownVisible.splice(index, 1);
      this.filteredAlimentos.splice(index, 1);
      this.alimentoNotFound.splice(index, 1);
      this.alimentoSelected.splice(index, 1);
      
      this.cdr.markForCheck();
    }
  }

  // Métodos para configuraciones
  agregarConfiguracion(configuracion?: Configuracion): void {
    console.log('Agregando configuración:', configuracion);

    // Solo permitir una configuración
    if (this.configuracionesArray.length >= 1) {
      return;
    }

    const configForm = this.fb.group({
      tipo_dieta_id: [configuracion?.tipo_dieta_id || '', Validators.required],
      tipo_comida_id: [configuracion?.tipo_comida_id || '', Validators.required],
      tipo_objetivo_id: [configuracion?.tipo_objetivo_id || '', Validators.required]
    });

    this.configuracionesArray.push(configForm);
    console.log('Configuraciones array length:', this.configuracionesArray.length);
    this.cdr.markForCheck();
  }

  eliminarConfiguracion(index: number): void {
    if (this.configuracionesArray.length > 1) {
      this.configuracionesArray.removeAt(index);
      this.cdr.markForCheck();
    }
  }

  // Métodos de validación
  isFieldInvalid(fieldName: string): boolean {
    const field = this.platilloForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  isIngredienteFieldInvalid(index: number, fieldName: string): boolean {
    const field = this.ingredientesArray.at(index).get(fieldName);
    const isFieldInvalid = !!(field && field.invalid && (field.dirty || field.touched));
    
    // Para el campo alimento_id, también considerar los estados de búsqueda
    if (fieldName === 'alimento_id') {
      const isNotFound = this.isAlimentoNotFound(index);
      const isNotSelected = !this.isAlimentoSelected(index) && !!this.alimentoSearchTerms[index];
      const isEmpty = this.isAlimentoSearchEmpty(index);
      
      return isFieldInvalid || isNotFound || isNotSelected || (isEmpty && !!(field?.dirty || field?.touched));
    }
    
    return isFieldInvalid;
  }

  isConfiguracionFieldInvalid(index: number, fieldName: string): boolean {
    const field = this.configuracionesArray.at(index).get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.platilloForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return `${fieldName} es requerido`;
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
    }
    return '';
  }

  // Métodos de utilidad
  getNombreAlimento(alimentoId: number): string {
    const alimento = this.alimentos.find(a => a.id === alimentoId);
    return alimento ? alimento.nombre : 'Seleccionar alimento';
  }

  calcularCaloriasTotales(): number {
    // Aquí podrías implementar un cálculo real basado en los ingredientes
    // Por ahora devolvemos el valor ingresado manualmente
    return this.platilloForm.get('calorias')?.value || 0;
  }



  private markFormGroupTouched(): void {
    Object.keys(this.platilloForm.controls).forEach(key => {
      const control = this.platilloForm.get(key);
      control?.markAsTouched();

      if (control instanceof FormArray) {
        control.controls.forEach(subControl => {
          Object.keys(subControl.value).forEach(subKey => {
            subControl.get(subKey)?.markAsTouched();
          });
        });
      }
    });
  }

  private scrollToFirstError(): void {
    setTimeout(() => {
      const firstError = document.querySelector('.is-invalid');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  onCancel(): void {
    this.activeModal.dismiss();
  }

  clearError(): void {
    this.errorMsg = null;
  }

  get modalTitle(): string {
    return this.isEdit ? 'Editar Platillo' : 'Crear Nuevo Platillo';
  }

  get submitButtonText(): string {
    return this.isEdit ? 'Actualizar Platillo' : 'Crear Platillo';
  }

  // Track by functions para *ngFor
  trackByIndex(index: number): number {
    return index;
  }

  trackByAlimento(index: number, alimento: Alimento): number {
    return alimento.id;
  }

  trackByTipoDieta(index: number, tipo: TipoDieta): number {
    return tipo.id;
  }

  trackByTipoComida(index: number, tipo: TipoComida): number {
    return tipo.id;
  }

  trackByTipoObjetivo(index: number, tipo: TipoObjetivo): number {
    return tipo.id;
  }

}
