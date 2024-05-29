import { HttpContext } from '@adonisjs/core/http';
export type PipeTerminateFunction = () => void | Promise<void>;
export type PipeFunction = (context: HttpContext, terminate: PipeTerminateFunction) => Promise<void>;
export default function pipe(...items: PipeFunction[]): (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
