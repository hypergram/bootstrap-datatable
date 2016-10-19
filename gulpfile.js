var gulp = require('gulp');
var sass = require('gulp-sass');
var rename = require('gulp-rename');
var jshint = require('gulp-jshint');
var stylish = require('jshint-stylish');
var uglify = require('gulp-uglify');

gulp.task('js', function () {
    gulp.src('bootstrap-datatable.js')
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(rename({ suffix: '.min' }))
      .pipe(uglify())
      .pipe(gulp.dest('dist/'));
});

gulp.task('sass', function () {
    gulp.src('bootstrap-datatable.scss')
      .pipe(sass({ style: 'expanded' }).on('error', sass.logError))
      .pipe(gulp.dest('dist/'));
});
