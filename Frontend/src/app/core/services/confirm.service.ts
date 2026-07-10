import {
  Injectable, ApplicationRef,
  createComponent, EnvironmentInjector, signal
} from '@angular/core';
import {
  ConfirmModalComponent,
  ConfirmModalOptions
} from '../../shared/confirm-modal/confirm-modal.component';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private modalRef?: InstanceType<typeof ConfirmModalComponent>;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  async confirm(options: ConfirmModalOptions): Promise<boolean> {
    // Create the component dynamically and attach to DOM
    const hostEl = document.createElement('div');
    document.body.appendChild(hostEl);

    const ref = createComponent(ConfirmModalComponent, {
      environmentInjector: this.injector,
      hostElement: hostEl
    });

    this.appRef.attachView(ref.hostView);
    this.modalRef = ref.instance;

    const confirmed = await ref.instance.open(options);

    // Cleanup
    setTimeout(() => {
      this.appRef.detachView(ref.hostView);
      ref.destroy();
      document.body.removeChild(hostEl);
    }, 300);

    return confirmed;
  }

  setLoading(val: boolean) {
    this.modalRef?.setLoading(val);
  }

  close() {
    this.modalRef?.close();
  }
}