//插件引入
var gulp = require('gulp'); 								//gulp 模块
var del = require('del');									//清理文件
var clean = require('gulp-clean');							//清理文件
var sass = require('gulp-sass'); 							//sass 编译模块
var concat = require('gulp-concat');           				//合并
var jshint = require('gulp-jshint');           				//js规范验证
var uglify = require('gulp-uglify');           				//压缩
var gulpUtil = require('gulp-util');						//gulp工具类
var imageMin = require('gulp-imagemin');					//图片压缩
var rename = require('gulp-rename');          				//文件名命名
var watch = require('gulp-watch');							//监听,gulp 默认的不能监听文件增加和删除
var handlebars = require('gulp-compile-handlebars');		//handlebars 模板
var sourceMaps = require('gulp-sourcemaps');				//源图生成
var cleanCss = require('gulp-clean-css');					//css 压缩
var runSequence = require('run-sequence');					//顺序执行
var mergeStream = require('merge-stream');					//合并多个流，返回该留时能够保证顺序执行
var typescript = require('gulp-typescript');				//Typescript 编译工具
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
var configuration = parseArgs(process.argv.slice(2), {
	boolean: ['release'],
	string: ['version', 'dist'],
	alias: {n: 'name', r: 'release', v: 'version', d: 'dest', z: 'zip'}, //配置变量取别名
	default: {
		name: 'trifle-asset'		//文件名
		, release: false 			//是否是发布版本
		, version: '1.0.0' 			//当前版本号
		, dist: './release' 		//发布基路径
		, zip: true					//是否启用压缩
	}
});

//资源配置
var resources = {
	html: { //网页
		page: { //页面配置
			batch: ['./app/html/_part'], //handlebars 组件位置
			src: ['./app/html/**/*.hb', '!./app/html/_part/**/*.hb'], //handlebars 文件位置
			dist: './html', //目标位置
			watch: ['./app/html/**/*.hb']
		}
	},
	style: { //样式
		common: { //页面内通用样式
			src: ['./app/style/common/trifle.scss'], //源文件
			dist: './dist/style', //目标位置
			include: ['./app/style/common/**/*.scss'],
			concat: 'app.min.css', //合并后文件名
			watch: ['./app/style/common/**/*.scss'] //监听文件
		},
		page: { //每个页面对应的样式
			src: ['./app/style/page/**/*.scss'],
			dist: './dist/style/page',
			include: ['./app/style/common/**/*.scss', './app/style/page/**/*.scss'],
			watch: ['./app/style/page/**/*.scss']
		},
		libs: { //通用样式库
			src: ['./app/style/test/**/*.scss'],
			dist: './dist/style',
			concat: 'libs.min.css'
		},
		bootstrap: { //bootstrap 库配置信息
			src: ['./vendor/bootstrap/dist/css/bootstrap.css'],
			dist: './dist/style',
			concat: 'bootstrap.min.css'
		}
	},
	script: { //脚本
		common: { //项目内脚本
			src: ['./app/script/common/**/*.ts'],
			dist: './dist/script/common'
		},
		page: { //每个页面对应的脚本
			src: ['./app/script/page/**/*.ts'],
			dist: './dist/script/page'
		},
		libs: { //通用脚本库
			src: ['', '', ''],
			dist: './dist/script',
			concat: 'lib.min.js'
		},
		jquery: { //jquery 库配置信息
			src: [''],
			dist: './dist/script',
			concat: 'jquery.min.js'
		}
	},
	image: {
		common: {
			src: ['./app/image/**/*.{png,jpg,gif,ico}'],
			dist: './dist/image'
		}
	}
};

//region 资源文件编译压缩

//region html 编译

/** handlebars 模板编译 */
gulp.task('html', function () {
	var options = {
		ignorePartials: true, //忽略找不到的模板
		batch: resources.html.page.batch
	};

	return gulp.src(resources.html.page.src)
			.pipe(handlebars(handlebars_data, options))
			.pipe(rename({extname: '.html'}))
			.pipe(gulp.dest(resources.html.page.dist));
});

//endregion

//region css 编译

/** css 编译合并压缩同步浏览器 */
gulp.task('css:app', function () {
	var commonCss = gulp.src(resources.style.common.src)
			.pipe(gulpIf(!configuration.release, sourceMaps.init({loadMaps: true})))
			.pipe(sass({includePaths: resources.style.common.include}))
			.on('error', gulpUtil.log)
			.pipe(cleanCss())
			.pipe(concat(resources.style.common.concat))
			.pipe(gulpIf(!configuration.release, sourceMaps.write()))
			.pipe(gulp.dest(resources.style.common.dist))
			.pipe(reload({stream: true}));

	var pageCss = gulp.src(resources.style.page.src)
			.pipe(gulpIf(!configuration.release, sourceMaps.init({loadMaps: true})))
			.pipe(sass())
			.on('error', gulpUtil.log)
			.pipe(cleanCss())
			.pipe(gulpIf(!configuration.release, sourceMaps.write()))
			.pipe(gulp.dest(resources.style.page.dist))
			.pipe(reload({stream: true}));

	return mergeStream(commonCss, pageCss);
});

/** css 库压缩合并，分类型压缩 */
gulp.task('css:lib', function () {
	var libsCss = gulp.src(resources.style.libs.src)
			.pipe(gulpIf(!configuration.release, sourceMaps.init({loadMaps: true})))
			.pipe(cleanCss())
			.pipe(concat(resources.style.libs.concat))
			.pipe(gulpIf(!configuration.release, sourceMaps.write()))
			.pipe(gulp.dest(resources.style.libs.dist))
			.pipe(reload({stream: true}));

	var bootstrapCss = gulp.src(resources.style.bootstrap.src)
			.pipe(gulpIf(!configuration.release, sourceMaps.init({loadMaps: true})))
			.pipe(cleanCss())
			.pipe(concat(resources.style.bootstrap.concat))
			.pipe(gulpIf(!configuration.release, sourceMaps.write()))
			.pipe(gulp.dest(resources.style.bootstrap.dist))
			.pipe(reload({stream: true}));

	return mergeStream(libsCss, bootstrapCss)
});

//endregion

//region js 编译

/** js 压缩同步，区分项目内通用文件和每个页面对应的文件。 */
gulp.task('js:app', function () {
	/*	var commonJs = gulp.src(resources.script.common.src)
	 .pipe(typescript({}))
	 .pipe(jshint())
	 .pipe(uglify())
	 .pipe(gulp.dest(resources.script.common.dest))
	 .pipe(reload({stream: true}));

	 var pageJs = gulp.src(resources.script.page.src)
	 .pipe(jshint())
	 .pipe(uglify())
	 .pipe(gulp.dest(resources.script.page.dest))
	 .pipe(reload({stream: true}));

	 return mergeStream(commonJs, pageJs);*/

	return mergeStream(gulp.src(resources.script.common.src), gulp.src(resources.script.page.src))
			.pipe(gulpIf(!configuration.release, sourceMaps.init({loadMaps: true})))
			.pipe(typescript({target: 'ES5', module: 'umd'}))
			.on('error', gulpUtil.log)
			.pipe(jshint())
			.pipe(uglify())
			.pipe(gulpIf(!configuration.release, sourceMaps.write()))
			.pipe(gulp.dest(resources.script.common.dist))
			.pipe(reload({stream: true}));
});

/** js lib 压缩同步，支持不同类型的库进行打包 */
gulp.task('js:lib', function () {
	var libStream = gulp.src(resources.script.libs.src)
			.pipe(uglify())
			.pipe(concat(resources.script.libs.concat))
			.pipe(gulp.dest(resources.script.libs.dist))
			.pipe(reload({stream: true}));

	var jqueryStream = gulp.src(resources.script.jquery.src)
			.pipe(uglify())
			.pipe(concat(resources.script.jquery.concat))
			.pipe(gulp.dest(resources.script.jquery.dist))
			.pipe(reload({stream: true}));

	return mergeStream(libStream, jqueryStream);
});

//endregion

//region img 压缩

/** 图片资源文件 */
gulp.task('img:common', function () {
	gulp.src(resources.image.common.src)
			.pipe(imageMin({
				optimizationLevel: 5, //类型：Number  默认：3  取值范围：0-7（优化等级）
				progressive: true, //类型：Boolean 默认：false 无损压缩jpg图片
				interlaced: true, //类型：Boolean 默认：false 隔行扫描gif进行渲染
				multipass: true //类型：Boolean 默认：false 多次优化svg直到完全优化
			}))
			.on('error', gulpUtil.log)
			.pipe(gulp.dest(resources.image.common.dist));
});

gulp.task('img:sprite', function () {
});

//endregion

//endregion

//region 发布清理调试

/** 编译资源文件 */
gulp.task('compile', ['img:common', 'img:sprite', 'css:lib', 'css:app', 'js:lib', 'js:app', 'html']);

/** 清理项目 */
gulp.task('clean:app', function () {
	return del(['./dist', './html', './tmp']);
});

/** 清理发布目录 */
gulp.task('clean:release', function () {
	return del(['./release']);
});

/** 开启浏览器同步插件，支持 html/css/js 变动重新加载 */
gulp.task('serve', ['compile'], function () {
	browserSync.init({
		server: {
			baseDir: './', //基础目录
			directory: true, //directory listing
			index: 'html/index.html' //index file name
		},
		online: false, //离线应用
		open: false, //关闭自动打开页面，避免浏览器打开太多页面。
		reloadOnRestart: true //Browser sync 重启时重新加载页面
	});
	watch(resources.html.page.watch, function () {
		runSequence('html', reload);
	});
	watch(resources.style.common.watch, function () {
		gulp.start(['css:app']);
	});
	watch(resources.style.page.watch, function () {
		gulp.start(['css:app']);
	});
	watch(resources.script.common.src, function () {
		gulp.start(['js:app']);
	});
	watch(resources.script.page.src, function () {
		gulp.start(['js:app']);
	});
});

/** 帮助 */
gulp.task('help', function () {
	//TODO: 最终完善帮助说明
	var tasks = {
		'help       ': '帮助',
	};

	console.log('\nUsage\n  gulp [TASK] [OPTIONS...]\n\nAvailable tasks');
	for (var i in tasks) {
		console.log('  ' + i + tasks[i]);
	}
	console.log('');
});

gulp.task('package', function () {
	var archive = configuration.name + '-' + configuration.version + (configuration.release ? '-release' : '') + '.zip';
	return gulp.src(['./dist/**/', './html/**/*'], {base: './'})
			.pipe(gulpIf(configuration.zip, zip(archive)))
			.pipe(gulp.dest(configuration.dist));
});

/**现有文件打包到发布文件夹中*/
gulp.task('archive', function () {
	runSequence('clean:app', 'compile', 'package');
});

gulp.task('debug', ['help'], function () {
});

/** 默认任务 */
gulp.task('default', ['help']);
//endregion