'use strict';
var gulp = require('gulp');
var guppy = require('git-guppy')(gulp);
var runSequence = require('run-sequence');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var stylish_lint_reporter = require('jshint-stylish');
var env = require('gulp-env');

gulp.task('test', function() {
    const envs = env.set({
        stage: 'test',
        NODE_ENV: 'test'
    });

    return gulp.src('lambda_functions/**/*.test.js', {read:false})
        .pipe(envs)
        .pipe(mocha({ timeout: 5000 }));
});

gulp.task('lint', function() {
  return gulp.src([
  	'./handler.js',
    './lib/**/*.js',
    './gulpfile.js',
    './test/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter(stylish_lint_reporter))
    .pipe(jshint.reporter('fail'));
});

/* git-hook tasks - Search "guppy-hook" on npm to find all guppy-hook packages. */
//dependant on guppy-pre-commit package
gulp.task('pre-commit', function() {
  return runSequence('test', 'lint');
});