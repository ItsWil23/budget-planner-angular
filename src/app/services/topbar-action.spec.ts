import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateRef } from '@angular/core';
import { TopbarActionService } from './topbar-action';

describe('TopbarActionService', () => {
  let service: TopbarActionService;
  const first = {} as TemplateRef<unknown>;
  const second = {} as TemplateRef<unknown>;

  beforeEach(() => {
    service = new TopbarActionService();
  });

  it('should expose no action by default', () => {
    expect(service.action()).toBeNull();
  });

  it('should expose the registered template', () => {
    service.register(first);

    expect(service.action()).toBe(first);
  });

  it('should clear the action when the registered template is unregistered', () => {
    service.register(first);
    service.unregister(first);

    expect(service.action()).toBeNull();
  });

  it('should ignore an unregister call from a template that is not the current one', () => {
    service.register(first);
    service.register(second);
    service.unregister(first);

    expect(service.action()).toBe(second);
  });
});
