import {ExerciseModel} from './exercise.model';
import {Subject} from 'rxjs/Subject';
import {AngularFirestore} from 'angularfire2/firestore';
import {Injectable} from '@angular/core';
import {Subscription} from 'rxjs/Subscription';

@Injectable()
export class TrainingService {

  exerciseChanged = new Subject<ExerciseModel>();
  exercisesChanged = new Subject<ExerciseModel[]>();
  finishedExercisesChanged = new Subject<ExerciseModel[]>();
  private fbSubs: Subscription[] = [];

  private availableExercises: ExerciseModel[] = [];
  private runningExercise: ExerciseModel;

  constructor(private db: AngularFirestore) {
  }

  fetchAvailableExercises() {
    this.fbSubs.push(this.db.collection('availableExercises')
      .snapshotChanges()
      .map(
        docArray => {
          return docArray.map(doc => {
            console.log(doc.payload.doc.data());
            return {
              id: doc.payload.doc.id,
              name: doc.payload.doc.data().name,
              duration: doc.payload.doc.data().duration,
              calories: doc.payload.doc.data().calories
            };
          });
        }
      )
      .subscribe((exercises: ExerciseModel[]) => {
        this.availableExercises = exercises;
        this.exercisesChanged.next([...this.availableExercises]);
      }));
  }

  startExercise(selectedId: string) {
    this.runningExercise = this.availableExercises.find(ex => ex.id === selectedId);
    this.exerciseChanged.next({...this.runningExercise});
  }

  getRunningExercise() {
    return {...this.runningExercise};
  }

  completeExercise() {
    this.addDataToDatabase(
      {
        ...this.runningExercise,
        date: new Date(),
        state: 'completed'
      });
    this.runningExercise = null;
    this.exerciseChanged.next(null);
  }

  cancelExercise(progress: number) {
    this.addDataToDatabase(
      {
        ...this.runningExercise,
        duration: this.runningExercise.duration * (progress / 100),
        calories: this.runningExercise.calories * (progress / 100),
        date: new Date(),
        state: 'canceled'
      });
    this.runningExercise = null;
    this.exerciseChanged.next(null);
  }

  fetchCompletedOrCancelledExercises() {
    this.fbSubs.push(this.db.collection('finishedExercises').valueChanges().subscribe(
      (exercises: ExerciseModel[]) => {
        this.finishedExercisesChanged.next(exercises);
      }
    ));
  }

  cancelSubscriptions() {
    this.fbSubs.forEach(subscription => {
      subscription.unsubscribe();
    });
  }

  private addDataToDatabase(exercise: ExerciseModel) {
    this.db.collection('finishedExercises').add(exercise);
  }
}
