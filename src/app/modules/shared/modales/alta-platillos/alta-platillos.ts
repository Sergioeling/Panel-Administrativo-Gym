import { Component, inject, OnInit, OnDestroy, Input, ChangeDetectorRef,OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray, FormsModule } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import Swal from 'sweetalert2';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { HttpServices } from '../../../../core/services/http/http.service';
import { log } from 'console';

interface PlatilloData {
  id?: string;
  nombre: string;
  descripcion: string;
  calorias: number | string;
  proteinas: number | string;
  carbohidratos: number | string;
  grasas: number | string;
  tiempo_preparacion: number | string;
  es_publico: number | string;
  imagen_url?: string;
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
  id?: string;
  alimento_nombre?: string;
  energia_kcal?: string;
  proteina_g?: string;
  lipidos_g?: string;
  hidratos_de_carbono_g?: string;
}

interface Configuracion {
  tipo_dieta_id: number;
  tipo_comida_id: number;
  tipo_objetivo_id: number;
  nombre_dieta?: string;
  nombre_comida?: string;
  nombre_objetivo?: string;
  tipo_dieta_nombre?: string;
  tipo_comida_nombre?: string;
  tipo_objetivo_nombre?: string;
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
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
  @Input() isViewOnly: boolean = false;
  @Input() dataSource!: any[];

  private dataSourceReady = false;
  loading = false;
  isLoadingConfig = false;
  isLoadingData = false;
  errorMsg: string | null = null;
  platilloForm: FormGroup;
  isFormReady = false;

  selectedDietaId: number | null = null;
  selectedComidaId: number | null = null;
  selectedObjetivoId: number | null = null;

  alimentos: Alimento[] = [];
  tiposDieta: TipoDieta[] = [];
  tiposComida: TipoComida[] = [];
  tiposObjetivo: TipoObjetivo[] = [];
  loadingCatalogos = false;

  unidadesMedida = [
    'g', 'kg', 'ml', 'l', 'pza', 'taza', 'cdita', 'cda', 'onza', 'lb'
  ];

  alimentoSearchTerms: string[] = [];
  alimentoDropdownVisible: boolean[] = [];
  filteredAlimentos: Alimento[][] = [];
  alimentoNotFound: boolean[] = [];
  alimentoSelected: boolean[] = [];
  platillosSimilares: any[] = [];
  nombreDuplicadoExacto: boolean = false;
  showSimilaresDropdown: boolean = false;

  selectedImageFile: File | null = null;
  selectedImagePreview: string | null = null;

  constructor() {
    this.platilloForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      calorias: [0, [Validators.required, Validators.min(1)]],
      proteinas: [0, [Validators.required, Validators.min(0)]],
      carbohidratos: [0, [Validators.required, Validators.min(0)]],
      grasas: [0, [Validators.required, Validators.min(0)]],
      precio_platillo: [0, [Validators.required, Validators.min(0)]],
      tiempo_preparacion: [0, [Validators.required, Validators.min(1)]],
      es_publico: [1, Validators.required],
      ingredientes: this.fb.array([]),
      configuraciones: this.fb.array([]) 
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataSource'] && changes['dataSource'].currentValue) {
      console.log("DATAPLATILLOS en ngOnChanges:", this.dataSource);
      this.dataSourceReady = true;
    }
  }

  ngOnInit(): void {
    console.log("DATAPLATILLOS:", this.dataSource);
    
    this.cargarCatalogos();

    this.alimentoSearchTerms = [];
    this.alimentoDropdownVisible = [];
    this.filteredAlimentos = [];
    this.alimentoNotFound = [];
    this.alimentoSelected = [];

    if (this.ingredientesArray.length === 0) {
      this.agregarIngrediente();
    }

    if (this.configuracionesArray.length === 0) {
      this.agregarConfiguracion();
    }

    this.isFormReady = true;
    this.cdr.markForCheck();

    // Deshabilitar formulario si está en modo solo lectura
    if (this.isViewOnly) {
      this.platilloForm.disable();
    }

    if (this.isEdit && this.platilloData) {
      this.isLoadingData = true;
      setTimeout(() => {
        if (!this.loadingCatalogos) {
          this.cargarDatosPlatillo();
        } else {
          setTimeout(() => {
            this.cargarDatosPlatillo();
          }, 1500);
        }
      }, 1200);
    } else {
      this.isLoadingData = false;
    }
  }

  private actualizarSelectsConDatos(): void {
    if (!this.isEdit || !this.platilloData) return;

    if (this.configuracionesArray.length > 0 &&
      this.tiposDieta.length > 0 &&
      this.tiposComida.length > 0 &&
      this.tiposObjetivo.length > 0) {

      const config = this.configuracionesArray.at(0);
      if (config) {
        const valores = config.value;

        this.selectedDietaId = valores.tipo_dieta_id;
        this.selectedComidaId = valores.tipo_comida_id;
        this.selectedObjetivoId = valores.tipo_objetivo_id;

        this.cdr.detectChanges();

        setTimeout(() => {
          config.patchValue({
            tipo_dieta_id: valores.tipo_dieta_id,
            tipo_comida_id: valores.tipo_comida_id,
            tipo_objetivo_id: valores.tipo_objetivo_id
          });

          this.cdr.detectChanges();

          setTimeout(() => {
            this.cdr.detectChanges();

            const dietaSeleccionada = this.tiposDieta.find(d => d.id == valores.tipo_dieta_id);
            const comidaSeleccionada = this.tiposComida.find(c => c.id == valores.tipo_comida_id);
            const objetivoSeleccionado = this.tiposObjetivo.find(o => o.id == valores.tipo_objetivo_id);

            this.forceSelectValues();
          }, 100);
        }, 150);
      }
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
            this.tiposDieta = (resp.tiposDieta.data || []).filter((item: any) => item.status == '1');
          }
          if (resp.tiposComida?.status === 'success') {
            this.tiposComida = (resp.tiposComida.data || []).filter((item: any) => item.status == '1');
          }
          if (resp.tiposObjetivo?.status === 'success') {
            this.tiposObjetivo = (resp.tiposObjetivo.data || []).filter((item: any) => item.status == '1');
          }

          this.loadingCatalogos = false;
          this.cdr.markForCheck();

          this.actualizarSelectsConDatos();
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

    if (this.platilloData.id && !this.platilloData.ingredientes) {
      this.http.obtenerPlatilloById(Number(this.platilloData.id))
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.isLoadingData = false;
            if (response?.status === 'success' && response.data) {
              this.cargarDatosFormulario(response.data);
            } else {
              this.cargarDatosFormulario(this.platilloData!);
            }
          },
          error: () => {
            this.isLoadingData = false;
            this.cargarDatosFormulario(this.platilloData!);
          }
        });
    } else {
      this.cargarDatosFormulario(this.platilloData);
    }
  }

  private cargarDatosFormulario(platilloData: PlatilloData): void {
   
    
    const platilloFormData: any = {};
    Object.keys(this.platilloForm.controls).forEach(key => {
      if (key !== 'ingredientes' && key !== 'configuraciones') {
        let valor = platilloData[key as keyof PlatilloData] || '';

        if (key === 'calorias' || key === 'tiempo_preparacion') {
          valor = Number(valor) || 0;
        }
        if (key === 'es_publico') {
          valor = Number(valor) || 1;
        }

        if (key === 'precio_platillo') {
          valor = Number(valor) || 0;
        }

        platilloFormData[key] = valor;
      }
    });

    console.log("PLATILLOS INFO: ", platilloFormData); 
    

    this.platilloForm.patchValue(platilloFormData);

    this.limpiarFormArrays();

    if (platilloData.ingredientes && platilloData.ingredientes.length > 0) {
      platilloData.ingredientes.forEach((ingrediente, index) => {
        const ingredienteMapeado: Ingrediente = {
          alimento_id: ingrediente.alimento_id || Number(ingrediente.alimento_id),
          cantidad: ingrediente.cantidad || Number(ingrediente.cantidad),
          unidad_medida: ingrediente.unidad_medida || 'g',
          nombre_alimento: ingrediente.alimento_nombre || ingrediente.nombre_alimento
        };
        this.agregarIngrediente(ingredienteMapeado);
      });
    } else {
      this.agregarIngrediente();
    }

    if (platilloData.configuraciones && platilloData.configuraciones.length > 0) {
      platilloData.configuraciones.forEach((config, index) => {
        const configMapeada: Configuracion = {
          tipo_dieta_id: config.tipo_dieta_id || Number(config.tipo_dieta_id),
          tipo_comida_id: config.tipo_comida_id || Number(config.tipo_comida_id),
          tipo_objetivo_id: config.tipo_objetivo_id || Number(config.tipo_objetivo_id),
          nombre_dieta: config.tipo_dieta_nombre || config.nombre_dieta,
          nombre_comida: config.tipo_comida_nombre || config.nombre_comida,
          nombre_objetivo: config.tipo_objetivo_nombre || config.nombre_objetivo
        };

        this.agregarConfiguracion(configMapeada);
      });
    } else {
      this.agregarConfiguracion();
    }

    this.cdr.detectChanges();

    if (this.isViewOnly) {
      this.ingredientesArray.disable();
      this.configuracionesArray.disable();
    }

    // Cargar imagen existente si está disponible
    if (platilloData.imagen_url && platilloData.imagen_url.trim() !== '') {
      this.selectedImagePreview = platilloData.imagen_url;
    } else {
      this.selectedImagePreview = null;
    }

    // Forzar detección de cambios después de cargar la imagen
    this.cdr.detectChanges();

    setTimeout(() => {
      if (this.configuracionesArray.length > 0) {
        const config = this.configuracionesArray.at(0);
      }
    }, 100);
  }

  private limpiarFormArrays(): void {
    while (this.ingredientesArray.length !== 0) {
      this.ingredientesArray.removeAt(0);
    }

    while (this.configuracionesArray.length !== 0) {
      this.configuracionesArray.removeAt(0);
    }
  }

  onAlimentoSearch(event: any, index: number): void {
    const term = event.target.value.toLowerCase();
    this.alimentoSearchTerms[index] = event.target.value;

    this.alimentoSelected[index] = false;
    this.ingredientesArray.at(index).get('alimento_id')?.setValue('');

    if (term.length >= 2) {
      this.filteredAlimentos[index] = this.alimentos.filter(alimento =>
        alimento.nombre.toLowerCase().includes(term)
      );

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

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.errorMsg = 'La imagen no puede ser mayor a 5MB';
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMsg = 'Solo se permiten archivos JPG, PNG y GIF';
        return;
      }

      this.selectedImageFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImagePreview = e.target.result;
        this.cdr.markForCheck();
      };
      reader.readAsDataURL(file);
    }
  }

  handleImageError(event: any): void {
    if (event.target) {
      console.warn('Error al cargar imagen:', event.target.src);
      // Ocultar la imagen que falló y mostrar un placeholder
      event.target.style.display = 'none';
      
      // Crear un elemento de reemplazo si no existe
      let placeholder = event.target.nextElementSibling;
      if (!placeholder || !placeholder.classList.contains('image-error-placeholder')) {
        placeholder = document.createElement('div');
        placeholder.className = 'image-error-placeholder mt-2 p-3 border rounded text-center text-muted';
        placeholder.innerHTML = '<i class="fas fa-image-slash fa-2x mb-2"></i><br><small>Error al cargar la imagen</small>';
        event.target.parentNode.insertBefore(placeholder, event.target.nextSibling);
      }
    }
  }

  getAlimentoSearch(index: number): string {
    return this.alimentoSearchTerms[index] || '';
  }

  getFilteredAlimentos(index: number): Alimento[] {
    return this.filteredAlimentos[index] || [];
  }

  isAlimentoNotFound(index: number): boolean {
    return this.alimentoNotFound[index] || false;
  }

  isAlimentoSelected(index: number): boolean {
    return this.alimentoSelected[index] || false;
  }

  isAlimentoSearchEmpty(index: number): boolean {
    const searchTerm = this.alimentoSearchTerms[index] || '';
    const isSelected = this.isAlimentoSelected(index);
    return searchTerm.length === 0 && !isSelected;
  }

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

  onVisibilidadChange(event: any): void {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.platilloForm.get('es_publico')?.setValue(isChecked ? '1' : '0');
  }

  hideAllDropdowns(event?: any): void {
    if (event && (event.target.closest('.alimento-dropdown') || event.target.closest('input[placeholder="Buscar alimento..."]'))) {
      return;
    }

    this.alimentoDropdownVisible.fill(false);

    this.ingredientesArray.controls.forEach((control, index) => {
      const searchTerm = this.alimentoSearchTerms[index];
      const isSelected = this.alimentoSelected[index];

      if (searchTerm && !isSelected) {
        control.get('alimento_id')?.markAsTouched();
      }
    });
  }

  getFormProgress(): number {
    let progress = 0;
    const totalFields = 10;

    if (this.platilloForm.get('nombre')?.value) progress++;
    if (this.platilloForm.get('descripcion')?.value) progress++;
    if (this.platilloForm.get('calorias')?.value > 0) progress++;
    if (this.platilloForm.get('proteinas')?.value >= 0) progress++;
    if (this.platilloForm.get('carbohidratos')?.value >= 0) progress++;
    if (this.platilloForm.get('grasas')?.value >= 0) progress++;
    if (this.platilloForm.get('tiempo_preparacion')?.value > 0) progress++;

    if (this.platilloForm.get('es_publico')?.value !== null) progress++;

    if (this.ingredientesArray.length > 0) {
      const validIngredients = this.ingredientesArray.controls.filter(ing =>
        ing.get('alimento_id')?.value && ing.get('cantidad')?.value > 0
      );
      if (validIngredients.length > 0) progress++;
    }

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

  onSubmit(): void {

    console.log("HOLA");
    
    // Si está en modo solo lectura, simplemente cerrar el modal
    if (this.isViewOnly) {
      this.activeModal.close();
      return;
    }

    if (this.platilloForm.invalid) {
      this.markFormGroupTouched();
      this.scrollToFirstError();
      return;
    }

    this.loading = true;
    this.errorMsg = null;

    const rawFormData = this.platilloForm.value;
    

    const ingredientesValidos = rawFormData.ingredientes?.filter((ing: any, index: number) => {
      const isAlimentoSelected = this.isAlimentoSelected(index);
      const alimentoId = ing.alimento_id;
      const cantidad = ing.cantidad;
      const unidadMedida = ing.unidad_medida;

      return alimentoId && cantidad && cantidad > 0 && unidadMedida && isAlimentoSelected;
    }) || [];

    if (ingredientesValidos.length === 0) {
      this.loading = false;

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

    const configuracionesValidas = rawFormData.configuraciones?.filter((config: any) =>
      config.tipo_dieta_id && config.tipo_comida_id && config.tipo_objetivo_id
    ) || [];

    console.log(configuracionesValidas.tipo_dieta_id);
    

    if (configuracionesValidas.length === 0) {
      this.loading = false;
      Swal.fire({
        icon: 'warning',
        title: 'Configuraciones requeridas',
        text: 'Debes agregar al menos una configuración nutricional válida'
      });
      return;
    }

    const formData = new FormData();
    
    // Si estamos en modo edición, agregar el ID
    if (this.isEdit && this.platilloData?.id) {
      formData.append('id', this.platilloData.id);
    }
    
    formData.append('nombre', rawFormData.nombre?.trim() || '');
    formData.append('descripcion', rawFormData.descripcion?.trim() || '');
    formData.append('calorias', String(Number(rawFormData.calorias) || 0));
    formData.append('proteinas', String(Number(rawFormData.proteinas) || 0));
    formData.append('carbohidratos', String(Number(rawFormData.carbohidratos) || 0));
    formData.append('grasas', String(Number(rawFormData.grasas) || 0));
    formData.append('precio', String(Number(rawFormData.precio_platillo) || 0));
    formData.append('tiempo_preparacion', String(Number(rawFormData.tiempo_preparacion) || 0));
    formData.append('es_publico', String(Number(rawFormData.es_publico) || 0));

    // Agregar imagen solo si se seleccionó una nueva, o preservar la existente en modo edición
    if (this.selectedImageFile) {
      formData.append('imagen', this.selectedImageFile);
    } else if (this.isEdit && this.platilloData?.imagen_url) {
      // En modo edición, si no hay nueva imagen pero hay URL existente, enviar la URL actual
      formData.append('imagen_url_actual', this.platilloData.imagen_url);
    }

    const ingredientesData = ingredientesValidos.map((ing: any) => ({
      alimento_id: Number(ing.alimento_id),
      cantidad: Number(ing.cantidad),
      unidad_medida: ing.unidad_medida
    }));
    formData.append('ingredientes', JSON.stringify(ingredientesData));

    const configuracionesData = configuracionesValidas.map((config: any) => ({
      tipo_dieta_id: Number(config.tipo_dieta_id),
      tipo_comida_id: Number(config.tipo_comida_id),
      tipo_objetivo_id: Number(config.tipo_objetivo_id)
    }));
    formData.append('configuraciones', JSON.stringify(configuracionesData));

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
      ? this.http.actualizarPlatillo(formData)
      : this.http.crearPlatillo(formData);

    serviceCall
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
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
  get ingredientesArray(): FormArray {
    const array = this.platilloForm.get('ingredientes') as FormArray;
    return array;
  }

  get configuracionesArray(): FormArray {
    const array = this.platilloForm.get('configuraciones') as FormArray;
    return array;
  }

  agregarIngrediente(ingrediente?: Ingrediente): void {
    if (this.ingredientesArray.length >= 15) {
      return;
    }

    let alimentoId = '';
    let cantidad = '';
    let unidadMedida = 'g';

    if (ingrediente) {
      alimentoId = ingrediente.alimento_id ? String(ingrediente.alimento_id) : '';
      cantidad = ingrediente.cantidad ? String(ingrediente.cantidad) : '';
      unidadMedida = ingrediente.unidad_medida || 'g';
    }

    const ingredienteForm = this.fb.group({
      alimento_id: [alimentoId, Validators.required],
      cantidad: [cantidad, [Validators.required, Validators.min(0.1)]],
      unidad_medida: [unidadMedida, Validators.required]
    });

    this.ingredientesArray.push(ingredienteForm);

    const index = this.ingredientesArray.length - 1;
    this.alimentoSearchTerms[index] = '';
    this.alimentoDropdownVisible[index] = false;
    this.filteredAlimentos[index] = [...this.alimentos];
    this.alimentoNotFound[index] = false;
    this.alimentoSelected[index] = false;

    if (ingrediente?.alimento_id) {
      const alimento = this.alimentos.find(a => a.id === Number(ingrediente.alimento_id));
      if (alimento) {
        this.alimentoSearchTerms[index] = alimento.nombre;
        this.alimentoSelected[index] = true;
      } else {
        const nombreAlimento = ingrediente.alimento_nombre || ingrediente.nombre_alimento || `Alimento ID: ${ingrediente.alimento_id}`;
        this.alimentoSearchTerms[index] = nombreAlimento;
        this.alimentoSelected[index] = true;
      }
    }

    this.cdr.markForCheck();
  }

  eliminarIngrediente(index: number): void {
    if (this.ingredientesArray.length > 1) {
      this.ingredientesArray.removeAt(index);

      // Remover elementos correspondientes de los arrays de búsqueda
      this.alimentoSearchTerms.splice(index, 1);
      this.alimentoDropdownVisible.splice(index, 1);
      this.filteredAlimentos.splice(index, 1);
    }
  }

  agregarConfiguracion(configuracion?: Configuracion): void {
    if (this.configuracionesArray.length >= 1) {
      this.configuracionesArray.removeAt(0);
    }

    let dietaId = Number(configuracion?.tipo_dieta_id || '');
    let comidaId = configuracion?.tipo_comida_id || '';
    let objetivoId = configuracion?.tipo_objetivo_id || '';

    const configForm = this.fb.group({
      tipo_dieta_id: [dietaId, Validators.required],
      tipo_comida_id: [comidaId, Validators.required],
      tipo_objetivo_id: [objetivoId, Validators.required]
    });

    this.configuracionesArray.push(configForm);
                console.log("seleccionada: ", configForm.controls);


    setTimeout(() => {
      this.cdr.detectChanges();
    }, 50);
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
      if (field.errors['nombreDuplicado']) return '⚠️ Ya existe un platillo con este nombre exacto';

    }
    
    if (fieldName === 'imagen' && this.errorMsg && this.errorMsg.includes('imagen')) {
      return this.errorMsg;
    }
    
    return '';
  }

  getNombreAlimento(alimentoId: number): string {
    const alimento = this.alimentos.find(a => a.id === alimentoId);
    return alimento ? alimento.nombre : 'Seleccionar alimento';
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
    if (this.isViewOnly) {
      return 'Ver Detalles del Platillo';
    }
    return this.isEdit ? 'Editar Platillo' : 'Crear Nuevo Platillo';
  }

  get submitButtonText(): string {
    if (this.isViewOnly) {
      return 'Cerrar';
    }
    return this.isEdit ? 'Actualizar Platillo' : 'Crear Platillo';
  }

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

  onDietaChange(event: any) {
    console.log("hola");
    
    const value = event.target.value;
    this.selectedDietaId = value ? Number(value) : null;

    if (this.configuracionesArray.length > 0) {
      this.configuracionesArray.at(0)?.patchValue({
        tipo_dieta_id: this.selectedDietaId
      });
    }

    console.log("TIPO DIETA: ", this.configuracionesArray);
    
  }

  onComidaChange(event: any) {
    const value = event.target.value;
    this.selectedComidaId = value ? Number(value) : null;

    if (this.configuracionesArray.length > 0) {
      this.configuracionesArray.at(0)?.patchValue({
        tipo_comida_id: this.selectedComidaId
      });
    }
  }

  onObjetivoChange(event: any) {
    const value = event.target.value;
    this.selectedObjetivoId = value ? Number(value) : null;

    if (this.configuracionesArray.length > 0) {
      this.configuracionesArray.at(0)?.patchValue({
        tipo_objetivo_id: this.selectedObjetivoId
      });
    }
  }

  forceSelectValues() {
    if (this.configuracionesArray.length > 0) {
      const config = this.configuracionesArray.at(0);
      const valores = config?.value;

      setTimeout(() => {
        const selectDieta = document.querySelector('select[formControlName="tipo_dieta_id"]') as HTMLSelectElement;
        const selectComida = document.querySelector('select[formControlName="tipo_comida_id"]') as HTMLSelectElement;
        const selectObjetivo = document.querySelector('select[formControlName="tipo_objetivo_id"]') as HTMLSelectElement;

        if (selectDieta && valores?.tipo_dieta_id) {
          selectDieta.value = String(valores.tipo_dieta_id);
        }

        if (selectComida && valores?.tipo_comida_id) {
          selectComida.value = String(valores.tipo_comida_id);
        }

        if (selectObjetivo && valores?.tipo_objetivo_id) {
          selectObjetivo.value = String(valores.tipo_objetivo_id);

          selectObjetivo.dispatchEvent(new Event('change'));
        }

        this.cdr.detectChanges();
      }, 200);
    }
  }

  onNombreChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  this.alreadyExist(target.value);
}

 
alreadyExist(nombre: string): void {
  // Resetear estado
  this.platillosSimilares = [];
  this.nombreDuplicadoExacto = false;
  this.showSimilaresDropdown = false;

  if (!this.dataSource || !Array.isArray(this.dataSource) || this.dataSource.length === 0) {
    return;
  }

  if (!nombre || nombre.trim() === '' || nombre.trim().length < 2) {
    // Limpiar el error si el campo está vacío
    const nombreControl = this.platilloForm.get('nombre');
    if (nombreControl?.hasError('nombreDuplicado')) {
      const errors = { ...nombreControl.errors };
      delete errors['nombreDuplicado'];
      nombreControl.setErrors(Object.keys(errors).length ? errors : null);
    }
    return;
  }

  const nombreBuscado = nombre.toLowerCase().trim();

  // Buscar coincidencias exactas
  const duplicadosExactos = this.dataSource.filter((platillo) => {
    if (this.isEdit && this.platilloData && platillo.id === this.platilloData.id) {
      return false;
    }
    return platillo.nombre.toLowerCase().trim() === nombreBuscado;
  });

  // Buscar coincidencias parciales
  const similares = this.dataSource.filter((platillo) => {
    if (this.isEdit && this.platilloData && platillo.id === this.platilloData.id) {
      return false;
    }
    const nombrePlatillo = platillo.nombre.toLowerCase().trim();
    return nombrePlatillo.includes(nombreBuscado) && nombrePlatillo !== nombreBuscado;
  });

  // Si hay duplicado exacto
  if (duplicadosExactos.length > 0) {
    this.nombreDuplicadoExacto = true;
    this.platilloForm.get('nombre')?.setErrors({ 'nombreDuplicado': true });
    console.warn("⚠️ Ya existe un platillo con ese nombre exacto");
  } else {
    // Limpiar error de duplicado
    const nombreControl = this.platilloForm.get('nombre');
    if (nombreControl?.hasError('nombreDuplicado')) {
      const errors = { ...nombreControl.errors };
      delete errors['nombreDuplicado'];
      nombreControl.setErrors(Object.keys(errors).length ? errors : null);
    }
  }

  // Mostrar similares (máximo 5)
  if (similares.length > 0) {
    //this.platillosSimilares = similares.slice(0, 5);
    this.platillosSimilares = similares;
    this.showSimilaresDropdown = true;
    console.log(`📋 Encontrados ${similares.length} platillos similares`);
  }
}

hideSimilaresDropdown(): void {
  this.showSimilaresDropdown = false;
}

// Método para el trackBy
trackBySimilar(index: number, item: any): any {
  return item.id;
}

  getTypeOf(value: any): string {
    return typeof value;
  }
}
