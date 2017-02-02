import gulp from 'gulp';
import postcss from 'gulp-postcss';
import sourcemaps from 'gulp-sourcemaps';
import cssnano from 'cssnano';
import cssnext from 'cssnext';
import precss from 'precss';
import browserify from 'browserify';
import babelify from 'babelify';
import source from 'vinyl-source-stream';
import buffer from 'vinyl-buffer';
import inject from 'gulp-inject';
import htmlmin from 'gulp-htmlmin';
import minifyCss from 'gulp-minify-css';
import uglify from 'gulp-uglify';
import imagemin from 'gulp-imagemin';
import rename from 'gulp-rename';
import copy from 'gulp-copy';
import clean from 'gulp-clean';
import sequence from 'gulp-sequence';
import zip from 'gulp-zip';
import watchify from 'watchify';
import exit from 'gulp-exit';
import notify from 'gulp-notify';
import browserSync from 'browser-sync';

const reload = browserSync.reload;

const devPath = {
    html: 'dev/*.html',
    sass: 'dev/style/**/*.{scss,sass}',
    js: 'dev/script/**/*',
    img: 'dev/image/**/*',
    cssDir: 'dev/style',
    browserifyFile: 'dev/script/index.es6',
};

const tmpPath = {
    root: '.tmp/',
    html: '.tmp/*.html',
    css: '.tmp/**/*.css',
    js: '.tmp/**/*.js',
    jsTargetName: 'index.js',
};

const destPath = {
    root: 'dist/',
    imgDir: 'dist/image',
};

const util = {
    cleanSource: ['.tmp', 'dist', 'archive.zip'],
    copySource: [
        'dev/**/*',
        '!dev/*.html',
        '!dev/style/**/*',
        '!dev/script/**/*',
        '!dev/image/**/*',
    ],
    zipFile: 'archive.zip',
    compressFile: 'dist/**',
    compressDir: './',
    browserSyncDir: ['.tmp', 'dev'],
    devReloadSource: [
        'dev/**/*',
        '!dev/*.html',
        '!dev/style/**/*',
        '!dev/script/**/*',
    ]
};

const browserify_instance = browserify({
    entries: [devPath.browserifyFile],
    cache: {},
    packageCache: {},
    fullPaths: true,
    plugin: [watchify],
}).transform(babelify, {presets: ['es2015']});

gulp.task('sass', () => {
    const processors = [
        cssnext,
        precss,
        cssnano
    ];
    return gulp.src(devPath.sass)
        .pipe(sourcemaps.init())
        .pipe(postcss(processors))
        .pipe(sourcemaps.write('.'))
        .pipe(rename('style.css'))
        .pipe(gulp.dest(tmpPath.root))
        .pipe(reload({
            stream: true
        }));
});

gulp.task('browserify-es6', bundleJs);

function bundleJs(){
    return browserify_instance
    .bundle()
    .on('error', (err) => {
        console.log(err.toString());
        this.emit('end');
    })
    .pipe(source(tmpPath.jsTargetName))
    .pipe(buffer())
    .pipe(gulp.dest(tmpPath.root))
    .pipe(reload({stream: true}));
}

gulp.task('minify-html', () => {
    return gulp.src(tmpPath.html)
    .pipe(htmlmin({
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
    }))
    .pipe(gulp.dest(destPath.root));
});

gulp.task('minify-css', () => {
    return gulp.src(tmpPath.css)
    .pipe(minifyCss())
    .pipe(gulp.dest(destPath.root));
});

gulp.task('minify-js', () => {
    return gulp.src(tmpPath.js)
    .pipe(uglify())
    .pipe(gulp.dest(destPath.root));
});

gulp.task('inject', () => {
    var cssSource = gulp.src(tmpPath.css).pipe(minifyCss());
    var jsSource = gulp.src(tmpPath.js).pipe(uglify());

    return gulp.src(tmpPath.html)
    .pipe(inject(cssSource, {
        transform: function (filePath, file) {
          return `<style>${file.contents.toString('utf8')}</style>`;
        }
    }))
    .pipe(inject(jsSource, {
        transform: function (filePath, file) {
          return `<script>${file.contents.toString('utf8')}</script>`;
        }
    }))
    .pipe(htmlmin({
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
    }))
    .pipe(gulp.dest(destPath.root));
});

gulp.task('img', () => {
    return gulp.src(devPath.img)
    .pipe(imagemin())
    .pipe(gulp.dest(destPath.imgDir));
});

gulp.task('clean', () => {
    return gulp.src(util.cleanSource)
    .pipe(clean());
});

gulp.task('copy', () => {
    return gulp.src(util.copySource)
    .pipe(copy(destPath.root, {
        prefix: 1
    }));
});

gulp.task('compress', () => {
    return gulp.src(util.compressFile)
    .pipe(zip(util.zipFile))
    .pipe(gulp.dest(util.compressDir));
});

gulp.task('complete', () => {
    gulp.src('')
    .pipe(notify({
        message: 'build complete',
    }))
    .pipe(exit());
});

gulp.task('compile', (cb) => {
    sequence('clean', ['sass', 'browserify-es6'], cb);
});

gulp.task('default', ['compile'], () => {
    browserSync.init({
        port: 3123,
        server: {
            baseDir: util.browserSyncDir,
        },
    });

    gulp.watch(devPath.sass, ['sass']);
    browserify_instance.on('update', bundleJs);
    // gulp.watch(devPath.js, ['browserify-es6']);

    gulp.watch(util.devReloadSource).on('change', reload);
});

gulp.task('inject', (cb) => {
    sequence('compile', ['inject', 'img'], 'copy', 'compress', 'complete', cb);
});

gulp.task('build', (cb) => {
    sequence('compile', ['minify-html', 'minify-css', 'minify-js', 'img'], 'copy', 'compress', 'complete', cb);
});
