import Operator from '../Operator';
import Observer from '../Observer';
import Observable from '../Observable';
import Subscriber from '../Subscriber';

import ArrayObservable from '../observables/ArrayObservable';
import {ZipSubscriber, ZipInnerSubscriber, hasValue, mapValue} from './zip';

import tryCatch from '../util/tryCatch';
import {errorObject} from '../util/errorObject';

export default function combineLatest<T, R>(...xs: (Observable<any> | ((...values: Array<any>) => R)) []) {
  const project = <((...ys: Array<any>) => R)> xs[xs.length - 1];
  if (typeof project === "function") {
    xs.pop();
  }
  if (typeof this.subscribe === "function") {
    return new ArrayObservable([this].concat(xs)).lift(new CombineLatestOperator(project));
  }
  return new ArrayObservable(xs).lift(new CombineLatestOperator(project));
}


export class CombineLatestOperator<T, R> extends Operator<T, R> {

  constructor(protected project?: (...values: Array<any>) => R) {
    super();
  }

  call(observer: Observer<R>): Observer<T> {
    return new CombineLatestSubscriber<T, R>(observer, this.project);
  }
}

export class CombineLatestSubscriber<T, R> extends ZipSubscriber<T, R> {

  constructor(public    destination: Observer<R>,
              public    project?: (...values: Array<any>) => R) {
    super(destination, project, 0, []);
  }

  _subscribeInner(observable, values, index, total) {
    return observable.subscribe(new CombineLatestInnerSubscriber(this, values, index, total));
  }

  _innerComplete(innerSubscriber) {
    if((this.active -= 1) === 0) {
      this.destination.complete();
    }
  }
}

export class CombineLatestInnerSubscriber<T, R> extends ZipInnerSubscriber<T, R> {

  constructor(protected parent: ZipSubscriber<T, R>,
              protected values: any,
              protected index : number,
              protected total : number,
              protected events: number = 0) {
    super(parent, values, index, total, events);
  }

  _next(x) {

    const index = this.index;
    const total = this.total;
    const parent = this.parent;
    const values = this.values;
    const valueBox = values[index];
    let limit;

    if(valueBox) {
      valueBox[0] = x;
      limit = parent.limit;
    } else {
      limit = parent.limit += 1;
      values[index] = [x];
    }

    if(limit === total) {
      this._projectNext(values, parent.project);
    }
  }
}
