//插件引入
var gulp = require('gulp'); 								//gulp 模块
var del = require('del');									//清理文件
var clean = require('gulp-clean');							//清理文件
var sass = require('gulp-sass'); 							//sass 编译模块
var concat = require('gulp-concat');           				//合并
var jshint = require('gulp-jshint');           				//js规范验证
var uglify = require('gulp-uglify');           				//压缩
var rename = require('gulp-rename');          				//文件名命名
var watch = require('gulp-watch');							//监听
var handlebars = require('gulp-compile-handlebars');		//handlebars 模板
var sourceMaps = require('gulp-sourcemaps');				//源图生成
var cleanCss = require('gulp-clean-css');					//css 压缩
var runSequence = require('run-sequence');					//顺序执行
var mergeStream = require('merge-stream');					//合并多个流，返回该留时能够保证顺序执行
var gulpIf = require('gulp-if');							//gulp 条件判断
var zip = require('gulp-zip');								//压缩
var parseArgs = require('minimist');						//解析命令行参数

var browserSync = require('browser-sync').create();			//browser sync
var reload = browserSync.reload;							//browser reload
var amdOptimize = require('gulp-amd-optimizer'); 			//amd 优化
var concatSourceMap = require('gulp-concat-sourcemap'); 	//源图合并

//数据导入
var handlebars_data = require('./handlebars.json');			//handlebars 模板数据

//环境设置
var env = parseArgs(process.argv.slice(2), {
	boolean: ['release'],
	string: ['version', 'dist'],
	alias: {n: 'name', r: 'release', v: 'version', d: 'dest', z: 'zip'}, //配置变量取别名
	default: {
		name: 'trifle-asset'		//文件名
		, release: false 			//是否是发布版本
		, version: '1.0.0' 			//当前版本号
		, dest: './release' 		//发布基路径
		, zip: true					//是否启用压缩
	}
});

//TODO: 项目内区分通用和页面独立使用，通用压缩合并到一个文件中，独立的分别打包，每个页面个
//region 资源文件编译压缩

/** handlebars 模板编译 */
gulp.task('html', function () {
	var options = {
		ignorePartials: true, //忽略找不到的模板
		batch: ['./app/html/part']
	};

	return gulp.src('./app/html/*.hb')
			.pipe(handlebars(handlebars_data, options))
			.pipe(rename({extname: '.html'}))
			.pipe(gulp.dest('./html'));
});

/** css 编译合并压缩同步浏览器 */
gulp.task('css', function () {
	return gulp.src(['./app/style/**/*.scss'])
			.pipe(gulpIf(!env.release, sourceMaps.init({loadMaps: true})))
			.pipe(sass())
			.pipe(cleanCss())
			.pipe(concat('app.min.css'))
			.pipe(gulpIf(!env.release, sourceMaps.write()))
			.pipe(gulp.dest('./dist/style'))
			.pipe(reload({stream: true}));
});

/** css 库压缩合并*/
gulp.task('css-lib', function () {
	//TODO: 根据不同的类型的库分组打包
	return gulp.src(['./vendor/bootstrap/dist/css/bootstrap.css'])
			.pipe(gulpIf(!env.release, sourceMaps.init({loadMaps: true})))
			.pipe(cleanCss())
			.pipe(concat('lib.min.css'))
			.pipe(gulpIf(!env.release, sourceMaps.write()))
			.pipe(gulp.dest('./dist/style'))
			.pipe(reload({stream: true}));
});

/** 图片资源文件 */
gulp.task('img', function () {
});

gulp.task('img', function () {
});

/** js 压缩同步 */
gulp.task('js', function () {
	//TODO: 区分对待项目内通用的脚本和项目内每个页面对应的独立脚本
	gulp.src(['./app/script/**/*.js'], {base: 'app'})
			.pipe(jshint())
			.pipe(uglify())
			.pipe(gulp.dest('./dist/script'))
			.pipe(reload({stream: true}));
});

/** js lib 压缩同步 */
gulp.task('js-lib', function () {
	//TODO: 根据不同的类型的库分组打包
	gulp.src(['', '', ''])
			.pipe(uglify())
			.pipe(concat('lib.min.js'))
			.pipe(gulp.dest('./dist/script'))
			.pipe(reload({stream: true}));
});

//endregion

//region 发布清理调试

/** 编译资源文件 */
gulp.task('compile', ['img', 'css', 'css-lib', 'js', 'html']);

/** 清理项目 */
gulp.task('clean', function () {
	return del(['./dist', './html', './tmp']);
});

/** 开启浏览器同步插件，支持 html/css 变动重新加载 */
gulp.task('serve', ['compile'], function () {
	browserSync.init({
		server: {
			baseDir: './',
			index: 'html/index.html'
		}
	});

	gulp.watch("./app/style/**/*.scss", ['css']);
	gulp.watch("./app/style/**/*.js", ['js']);
	gulp.watch("./app/html/**/*.hb", ['html']);
	gulp.watch("./html/*.html").on('change', reload);
});

/** 帮助 */
gulp.task('help', function () {
	var tasks = {
		'help       ': '帮助',
		'serve      ': '开启服务',
		'clean      ': '清理生成的文件，包括中间文件',
		'css        ': '编译 scss 文件合并同步浏览器',
		'css-lib    ': '编译 vendor css 文件合并同步浏览器',
		'js         ': '编译 js',
		'html       ': '编译 html 模板',
		'compile    ': '执行 html/css/js 生成任务',
		'set-env    ': '设置环境',
		'archive    ': '打包待发布的资源文件'
	};

	console.log('\nUsage\n  gulp [TASK] [OPTIONS...]\n\nAvailable tasks');
	for (var i in tasks) {
		console.log('  ' + i + tasks[i]);
	}
	console.log('');
});

gulp.task('package', function () {
	var archive = env.name + '-' + env.version + (env.release ? '-release' : '') + '.zip';
	return gulp.src(['./dist/**/', './html/**/*'], {base: './'})
			.pipe(gulpIf(env.zip, zip(archive)))
			.pipe(gulp.dest(env.dest));
});

/**现有文件打包到发布文件夹中*/
gulp.task('archive', function () {
	console.log(env);
	runSequence('clean', 'compile', 'package');
});

/** 默认任务 */
gulp.task('default', ['help']);

gulp.task('debug', ['help'], function () {
});

//endregion