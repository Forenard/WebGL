// global
var c, cw, ch, mx, my, gl, run, eCheck;
var startTime;
var time = 0.0;
var tempTime = 0.0;
var fps = 1000 / 30;
var uniLocation = new Array();
var texture = null;
//録画
var stream;
var recoder;
var anchor;
var is_recode_start = false;
var is_rocoding = false;
var recoding_time = 1.0;

// onload
window.onload = function () {
    // canvas エレメントを取得
    c = document.getElementById('canvas');

    // canvas サイズ
    cw = 512; ch = 512;
    c.width = cw; c.height = ch;

    // エレメントを取得
    eCheck = document.getElementById('check');

    // イベントリスナー登録
    c.addEventListener('mousemove', mouseMove, true);
    eCheck.addEventListener('change', checkChange, true);

    // WebGL コンテキストを取得
    gl = c.getContext('webgl') || c.getContext('experimental-webgl');

    // シェーダ周りの初期化
    var prg = create_program(create_shader('vs'), create_shader('fs'));
    run = (prg != null); if (!run) { eCheck.checked = false; }
    uniLocation[0] = gl.getUniformLocation(prg, 'time');
    uniLocation[1] = gl.getUniformLocation(prg, 'mouse');
    uniLocation[2] = gl.getUniformLocation(prg, 'resolution');
    uniLocation[3] = gl.getUniformLocation(prg, "texture");

    // 有効にするテクスチャユニットを指定
    gl.activeTexture(gl.TEXTURE0);
    create_texture("vertical.jpg");

    // 頂点データ回りの初期化
    var position = [
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0,
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0
    ];
    // テクスチャ座標
    var textureCoord = [
        0.0, 0.0,
        1.0, 0.0,
        0.0, 1.0,
        1.0, 1.0
    ];

    var index = [
        0, 2, 1,
        1, 2, 3
    ];

    //vbo,ibo
    var vVbo = new Array();
    vVbo[0] = create_vbo(position);
    vVbo[1] = create_vbo(textureCoord);
    var vIbo = create_ibo(index);
    var vAttLocation = new Array();
    vAttLocation[0] = gl.getAttribLocation(prg, 'position');
    vAttLocation[1] = gl.getAttribLocation(prg, "textureCoord");
    var vAttStride = new Array();
    vAttStride[0] = 3;
    vAttStride[1] = 2;

    set_attribute(vVbo, vAttLocation, vAttStride);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, vIbo);

    // その他の初期化
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    mx = 0.5; my = 0.5;
    startTime = new Date().getTime();

    // レンダリング関数呼出
    render();
};

function recode_start() {
    //録画
    stream = c.captureStream();
    recoder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    anchor = document.getElementById('downloadlink');
    recoder.ondataavailable = function (e) {
        var videoBlob = new Blob([e.data], { type: e.data.type });
        blobUrl = window.URL.createObjectURL(videoBlob);
        anchor.download = 'movie.webm';
        anchor.href = blobUrl;
        anchor.style.display = 'block';
    }
    is_recode_start = true;
}

// レンダリングを行う関数
function render() {
    // フラグチェック
    if (!run) { return; }

    // 時間管理
    time = (new Date().getTime() - startTime) * 0.001;

    //録画
    if (is_recode_start) {
        recoder.start();
        startTime = new Date().getTime();
        is_recode_start = false;
        is_rocoding = true;
    }
    if (is_rocoding && time > recoding_time) {
        is_rocoding = false;
        recoder.stop();
    }

    // カラーバッファをクリア
    gl.clear(gl.COLOR_BUFFER_BIT);

    // テクスチャをバインドする
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // uniform 関連
    gl.uniform1f(uniLocation[0], time + tempTime);
    gl.uniform2fv(uniLocation[1], [mx, my]);
    gl.uniform2fv(uniLocation[2], [cw, ch]);
    gl.uniform1i(uniLocation[3], 0);

    // 描画
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    gl.flush();

    // 再帰
    setTimeout(render, fps);
}
function create_texture(source) {
    // イメージオブジェクトの生成
    var img = new Image();
    img.crossOrigin = "anonymous";

    // データのオンロードをトリガーにする
    img.onload = function () {
        // テクスチャオブジェクトの生成
        var tex = gl.createTexture();

        // テクスチャをバインドする
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // テクスチャへイメージを適用
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

        // ミップマップを生成
        gl.generateMipmap(gl.TEXTURE_2D);

        // テクスチャのバインドを無効化
        gl.bindTexture(gl.TEXTURE_2D, null);

        // 生成したテクスチャをグローバル変数に代入
        texture = tex;
    };

    // イメージオブジェクトのソースを指定
    img.src = source;
}

// IBOを生成する関数
function create_ibo(data) {
    // バッファオブジェクトの生成
    var ibo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    // バッファにデータをセット
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // 生成したIBOを返して終了
    return ibo;
}

// VBOをバインドし登録する関数
function set_attribute(vbo, attL, attS) {
    // 引数として受け取った配列を処理する
    for (var i in vbo) {
        // バッファをバインドする
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);

        // attributeLocationを有効にする
        gl.enableVertexAttribArray(attL[i]);

        // attributeLocationを通知し登録する
        gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
}

// シェーダを生成する関数
function create_shader(id) {
    // シェーダを格納する変数
    var shader;

    // HTMLからscriptタグへの参照を取得
    var scriptElement = document.getElementById(id);

    // scriptタグが存在しない場合は抜ける
    if (!scriptElement) { return; }

    // scriptタグのtype属性をチェック
    switch (scriptElement.type) {

        // 頂点シェーダの場合
        case 'x-shader/x-vertex':
            shader = gl.createShader(gl.VERTEX_SHADER);
            break;

        // フラグメントシェーダの場合
        case 'x-shader/x-fragment':
            shader = gl.createShader(gl.FRAGMENT_SHADER);
            break;
        default:
            return;
    }

    // 生成されたシェーダにソースを割り当てる
    gl.shaderSource(shader, scriptElement.text);

    // シェーダをコンパイルする
    gl.compileShader(shader);

    // シェーダが正しくコンパイルされたかチェック
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

        // 成功していたらシェーダを返して終了
        return shader;
    } else {

        // 失敗していたらエラーログをアラートする
        alert(gl.getShaderInfoLog(shader));
    }
}

// プログラムオブジェクトを生成しシェーダをリンクする関数
function create_program(vs, fs) {
    // プログラムオブジェクトの生成
    var program = gl.createProgram();

    // プログラムオブジェクトにシェーダを割り当てる
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);

    // シェーダをリンク
    gl.linkProgram(program);

    // シェーダのリンクが正しく行なわれたかチェック
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {

        // 成功していたらプログラムオブジェクトを有効にする
        gl.useProgram(program);

        // プログラムオブジェクトを返して終了
        return program;
    } else {

        // 失敗していたらエラーログをアラートする
        alert(gl.getProgramInfoLog(program));
    }
}

// VBOを生成する関数
function create_vbo(data) {
    // バッファオブジェクトの生成
    var vbo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // バッファにデータをセット
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 生成した VBO を返して終了
    return vbo;
}


// checkbox
function checkChange(e) {
    run = e.currentTarget.checked;
    if (run) {
        startTime = new Date().getTime();
        render();
    } else {
        tempTime += time;
    }
}

// mouse
function mouseMove(e) {
    mx = e.offsetX / cw;
    my = e.offsetY / ch;
}