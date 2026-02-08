// SPDX-FileCopyrightText: Copyright (C) 2023-2026 Bayerische Motoren Werke Aktiengesellschaft (BMW AG)<lichtblick@bmwgroup.com>
// SPDX-License-Identifier: MPL-2.0

// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  AppConfigurationValue,
  ChangeHandler,
  IAppConfiguration,
  LOCAL_STORAGE_APP_CONFIGURATION,
} from "@lichtblick/suite-base";

export default class LocalStorageAppConfiguration implements IAppConfiguration {
  static #KEY_PREFIX = LOCAL_STORAGE_APP_CONFIGURATION;

  /** Default values for app configuration items which have never been set by a user */
  #defaults?: { [key: string]: AppConfigurationValue };
  #overrides?: { [key: string]: AppConfigurationValue };

  #changeListeners = new Map<string, Set<ChangeHandler>>();

  public constructor({
    defaults,
    overrides,
  }: {
    defaults?: { [key: string]: AppConfigurationValue };
    overrides?: { [key: string]: AppConfigurationValue };
  }) {
    this.#defaults = defaults;
    this.#overrides = overrides;
  }

  public get(key: string): AppConfigurationValue {
    if (this.#overrides && key in this.#overrides) {
      return this.#overrides[key];
    }
    const value = localStorage.getItem(LocalStorageAppConfiguration.#KEY_PREFIX + key);
    try {
      return value == undefined ? this.#defaults?.[key] : JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  public async set(key: string, value: AppConfigurationValue): Promise<void> {
    if (this.#overrides && key in this.#overrides) {
      return;
    }
    if (value == undefined) {
      localStorage.removeItem(LocalStorageAppConfiguration.#KEY_PREFIX + key);
    } else {
      localStorage.setItem(
        LocalStorageAppConfiguration.#KEY_PREFIX + key,
        JSON.stringify(value) ?? "",
      );
    }
    const listeners = this.#changeListeners.get(key);
    if (listeners) {
      // Copy the list of listeners to protect against mutation during iteration
      [...listeners].forEach((listener) => {
        listener(value);
      });
    }
  }

  public addChangeListener(key: string, cb: ChangeHandler): void {
    let listeners = this.#changeListeners.get(key);
    if (!listeners) {
      listeners = new Set();
      this.#changeListeners.set(key, listeners);
    }
    listeners.add(cb);
  }

  public removeChangeListener(key: string, cb: ChangeHandler): void {
    const listeners = this.#changeListeners.get(key);
    if (listeners) {
      listeners.delete(cb);
    }
  }
}
