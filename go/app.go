package main

import (
	"context"
	"runtime"
)

// App struct – Wails Go backend
type App struct {
	ctx context.Context
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// shutdown is called when the app is closing
func (a *App) shutdown(ctx context.Context) {}

// GetPlatform returns the current OS platform string
// This can be called from the frontend via window.go.GetPlatform()
func (a *App) GetPlatform() string {
	return runtime.GOOS
}
