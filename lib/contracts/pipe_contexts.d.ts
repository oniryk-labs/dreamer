export type PipeContext = Record<string, any>;
export type PipeInterruptionFunction = () => void | Promise<void>;
export type PipeFunction = (context: HttpContext) => Promise<void>;

export type PipeContract = {
  context: PipeContext;
  interrupt: PipeInterruptionFunction;
};

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    pipe?: PipeContract;
  }
}
