import { driver, type DriveStep, type Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import './tour.css';
import { useEffect, useRef } from 'react';
import {
  playTourStepSound,
  unlockAchievementSound,
  useNotificationPreferences,
} from '../../features/notifications/notificationPreferences';
import type { SessionUser } from '../../auth/jwt';
import { hasPermission, isSeller, Permission } from '../../auth/permissions';

type Tip = { selector?: string; title: string; description: string };

/** Local to the current screen: no navigation, submissions or exposure of private values. */
export function tourTips(path: string, user: SessionUser | null): Tip[] {
  const tips: Tip[] = [
    {
      title: 'Guía de uso de LATK',
      description:
        'Conocé esta pantalla paso a paso. Podés cerrar la guía cuando quieras y volver a abrirla desde el menú de tu cuenta.',
    },
    {
      selector: '[data-tour="navigation"]',
      title: 'Tus secciones',
      description:
        'Usá la barra inferior en el celular o el menú lateral en escritorio. Las opciones disponibles dependen de los permisos de tu cuenta.',
    },
  ];
  const add = (title: string, description: string, selector?: string) =>
    tips.push({ title, description, selector });
  if (path === '/documentation') {
    add(
      'Documentación de flujos',
      'Esta guía corresponde al rol de tu cuenta. Usá el índice para consultar un flujo y Guía de esta pantalla para conocer los controles.',
      '[data-tour="page"]',
    );
  } else if (path === '/') {
    add(
      'Inicio',
      isSeller(user)
        ? 'Consultá tu cartera, cupo y objetivo del mes. Las ganancias se revelan al confirmar tu contraseña.'
        : 'Consultá el resumen de tu cartera y las tareas pendientes de tu cuenta.',
      '[data-tour="page"]',
    );
  } else if (path === '/customers') {
    add(
      'Clientes',
      'Buscá por nombre o DNI y usá los filtros para ubicar a quién cobrar o quién puede renovar. Tocá una tarjeta para abrir la ficha.',
      '[data-tour="page"]',
    );
    if (hasPermission(user, Permission.CUSTOMER_CREATE))
      add(
        'Nuevo cliente',
        'Usá Nuevo cliente o el botón + del celular. Completá los datos y revisalos antes de guardar.',
      );
  } else if (path.startsWith('/customers/')) {
    add(
      'Ficha del cliente',
      'Consultá los datos de contacto, sus préstamos y su historial. Abrí las secciones plegables para ver más información.',
      '[data-tour="page"]',
    );
    if (hasPermission(user, Permission.CUSTOMER_UPDATE))
      add(
        'Actualizar datos',
        'Usá Editar para corregir los datos del cliente y guardá los cambios cuando estén completos.',
      );
  } else if (path === '/loans/new') {
    add(
      'Solicitar un préstamo',
      'Elegí el cliente, la categoría, el monto y las cuotas. Revisá el resumen y confirmá la solicitud; esta guía no envía nada.',
      '[data-tour="page"]',
    );
  } else if (path === '/loans') {
    add(
      'Préstamos',
      'Buscá por cliente y filtrá por estado. Cobrar hoy incluye los préstamos atrasados. Tocá una tarjeta para consultar el detalle.',
      '[data-tour="page"]',
    );
    if (hasPermission(user, Permission.LOAN_APPROVE))
      add(
        'Revisar solicitudes',
        'Filtrá Por aprobar y abrí una solicitud para revisar sus condiciones antes de aprobarla o rechazarla.',
      );
  } else if (path.startsWith('/loans/')) {
    add(
      'Detalle del préstamo',
      'Revisá el estado, las condiciones y el calendario de cuotas. Las acciones aparecen según el estado y tus permisos.',
      '[data-tour="page"]',
    );
    if (hasPermission(user, Permission.COLLECTION_REGISTER))
      add(
        'Registrar un cobro',
        'Elegí la cuota o acción de cobro, revisá el importe y confirmá. Consultá luego el comprobante; avanzar en la guía no registra pagos.',
      );
    if (hasPermission(user, Permission.DISBURSEMENT_REGISTER))
      add(
        'Registrar desembolso',
        'En un préstamo aprobado, revisá los datos de transferencia antes de registrar el desembolso.',
      );
  } else if (path === '/simulator') {
    add(
      'Simular antes de solicitar',
      'Elegí una categoría, un monto y la cantidad de cuotas. Simular muestra las condiciones y el calendario sin crear un préstamo.',
      '[data-tour="page"]',
    );
  } else if (path === '/products') {
    add(
      'Categorías de préstamos',
      'Consultá los montos y cuotas disponibles para cada categoría. El simulador permite comparar las condiciones.',
      '[data-tour="page"]',
    );
    if (hasPermission(user, Permission.PRODUCT_MANAGE))
      add(
        'Administrar categorías',
        'La vista Administrar permite gestionar las condiciones y disponibilidad de los productos. Revisá los cambios antes de guardarlos.',
      );
  } else if (path === '/sellers' || path.startsWith('/sellers/')) {
    add(
      'Vendedores',
      'Abrí la ficha de un vendedor para consultar sus datos y gestionar las opciones que tengas habilitadas.',
      '[data-tour="page"]',
    );
  } else if (path === '/earnings') {
    add(
      'Tus ganancias',
      'Confirmá tu contraseña para consultar los importes privados. La guía explica la pantalla sin revelar tus ganancias.',
      '[data-tour="page"]',
    );
  } else if (path.startsWith('/settings/')) {
    add(
      'Configuración',
      'Revisá los campos de esta pantalla. Los cambios se aplican al guardar; no se modifican al avanzar por la guía.',
      '[data-tour="page"]',
    );
  } else {
    add(
      'Tu cuenta',
      'Revisá los datos y las opciones disponibles en esta pantalla. Completá los campos y confirmá cuando quieras guardar.',
      '[data-tour="page"]',
    );
  }
  add(
    'Simulador y productos',
    'Estas pestañas reúnen los préstamos, el simulador y las categorías que tu cuenta puede consultar.',
    '[data-tour="loan-tabs"]',
  );
  add(
    'Actualizar el listado',
    'Tocá Actualizar para traer los datos recientes. En el celular también podés arrastrar la zona indicada y soltar.',
    '[data-tour="refresh"]',
  );
  add(
    'Acción rápida',
    'El botón + cambia según la pantalla: puede crear un cliente, vendedor, categoría o solicitar un préstamo.',
    '[data-tour="quick-action"]',
  );
  add(
    'Volver a consultar la ayuda',
    'Abrí el menú de tu cuenta y elegí Guía de esta pantalla. También encontrás tus preferencias y el cambio de cuenta.',
    '[data-tour="account"]',
  );
  return tips;
}

export function visibleTourSteps(tips: Tip[]): DriveStep[] {
  return tips.flatMap(({ selector, title, description }) => {
    const element = selector
      ? Array.from(document.querySelectorAll<HTMLElement>(selector)).find((node) => {
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          return (
            node.getClientRects().length > 0 &&
            rect.right > 0 &&
            rect.left < window.innerWidth &&
            style.visibility !== 'hidden' &&
            style.display !== 'none'
          );
        })
      : undefined;
    if (selector && !element) return [];
    return [{ element, popover: { title, description } }];
  });
}

export function useGuidedTour(path: string, user: SessionUser | null) {
  const active = useRef<Driver | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
      active.current?.destroy();
      active.current = null;
    },
    [path, user],
  );

  return () => {
    unlockAchievementSound();
    if (pending.current) clearTimeout(pending.current);
    active.current?.destroy();
    // Let Mantine close its menu and restore focus before opening the guide.
    pending.current = setTimeout(() => {
      pending.current = null;
      const focus = document.querySelector<HTMLElement>('[data-tour="account"]');
      let lastStep: number | undefined;
      active.current = driver({
        steps: visibleTourSteps(tourTips(path, user)),
        popoverClass: 'latk-tour',
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Terminar',
        animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        allowClose: true,
        disableActiveInteraction: true,
        onHighlightStarted: (_element, _step, { state }) => {
          if (lastStep !== undefined && state.activeIndex !== lastStep) playTourStepSound();
          lastStep = state.activeIndex;
        },
        onPopoverRender: (popover) => {
          popover.closeButton.setAttribute('aria-label', 'Cerrar guía');
          popover.wrapper.querySelector('.latk-tour-sound')?.remove();
          const sound = document.createElement('button');
          sound.type = 'button';
          sound.className = 'latk-tour-sound';
          const update = () => {
            const enabled = useNotificationPreferences.getState().tourSound;
            sound.textContent = enabled ? 'Sonido: activado' : 'Sonido: silenciado';
            sound.setAttribute('aria-pressed', String(enabled));
            sound.setAttribute('aria-label', 'Sonido de los pasos de la guía');
          };
          update();
          sound.addEventListener('click', () => {
            const preferences = useNotificationPreferences.getState();
            preferences.set('tourSound', !preferences.tourSound);
            unlockAchievementSound();
            update();
          });
          popover.wrapper.append(sound);
        },
        onDestroyed: () => {
          if (focus?.isConnected) focus.focus({ preventScroll: true });
        },
      });
      active.current.drive();
    }, 180);
  };
}
